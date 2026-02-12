import crypto from "node:crypto";
import { z } from "zod";
import { PendingTileAction } from "@/types";
import { getState, addEvent, markUpdated, netWorthForPlayer } from "./gameState";
import { triggerRandomEvent } from "./events";

const joinSchema = z.object({ name: z.string().trim().min(2).max(24) });
const voteSchema = z.object({ playerId: z.string(), approve: z.boolean() });
const playerSchema = z.object({ playerId: z.string() });
const propertySchema = z.object({ playerId: z.string(), propertyId: z.string() });
const resolveSchema = z.object({ playerId: z.string(), buy: z.boolean().optional() });

function assertPlayer(id: string) {
  const player = getState().players.find((item) => item.id === id);
  if (!player) throw new Error("Player not found");
  return player;
}

function eliminateBankruptPlayers() {
  const state = getState();
  state.players.forEach((player) => {
    player.isBankrupt = player.coins <= 0;
  });
}

function maybeFinishGame() {
  const state = getState();
  const positive = state.players.filter((player) => player.coins > 0);

  if (state.round > 15 || positive.length <= 1) {
    state.status = "finished";
    state.turnDeadline = null;
    state.currentTurnPlayerId = null;
    state.pendingTileAction = null;
    const sorted = [...state.players].sort((a, b) => netWorthForPlayer(b.id) - netWorthForPlayer(a.id));
    state.winnerId = sorted[0]?.id ?? null;
    addEvent("game_over", "The game has ended. Final ranking is now available.");
  }
}

function turnKey() {
  const state = getState();
  return `${state.round}-${state.currentTurnPlayerId}`;
}

function advanceTurn(reason = "Turn changed") {
  const state = getState();
  if (!state.currentTurnPlayerId) return;

  const currentIndex = state.players.findIndex((item) => item.id === state.currentTurnPlayerId);
  if (currentIndex === -1) return;

  const alive = state.players.filter((item) => !item.isBankrupt);
  if (alive.length <= 1) {
    maybeFinishGame();
    return;
  }

  let nextIndex = (currentIndex + 1) % state.players.length;
  while (state.players[nextIndex].isBankrupt) {
    nextIndex = (nextIndex + 1) % state.players.length;
    if (nextIndex === currentIndex) break;
  }

  if (nextIndex <= currentIndex) {
    state.round += 1;
  }

  state.currentTurnPlayerId = state.players[nextIndex].id;
  state.turnDeadline = Date.now() + 30000;
  state.lastProcessedTurnKey = null;
  state.lastRoll = null;
  state.pendingTileAction = null;
  addEvent("turn_change", reason);
  maybeFinishGame();
}

function movePlayer(playerId: string, steps: number) {
  const state = getState();
  const player = assertPlayer(playerId);
  const before = player.position;
  const after = (player.position + steps) % state.board.length;
  if (before + steps >= state.board.length) {
    player.coins += 300;
    addEvent("event_triggered", `${player.name} completed a lap and earned +300 coins.`);
  }
  player.position = after;
  return state.board[after];
}

function buildPendingAction(playerId: string): PendingTileAction {
  const state = getState();
  const player = assertPlayer(playerId);
  const tile = state.board[player.position];

  if (tile.type === "property" && tile.propertyId) {
    const property = state.properties.find((item) => item.id === tile.propertyId);
    if (!property) throw new Error("Invalid property tile");

    const ownerName = property.ownerId ? state.players.find((item) => item.id === property.ownerId)?.name ?? "Outro" : "Nenhum";
    return {
      playerId,
      tileIndex: tile.index,
      tileType: tile.type,
      title: `Propriedade: ${property.name}`,
      description: `Valor: ${property.value} | Dono atual: ${ownerName}`,
      propertyId: property.id,
      propertyValue: property.value,
      canBuy: !property.ownerId
    };
  }

  if (tile.type === "luck") {
    return {
      playerId,
      tileIndex: tile.index,
      tileType: tile.type,
      title: "Casa da Sorte",
      description: "Você caiu em uma casa de sorte. Execute para revelar sua recompensa!"
    };
  }

  if (tile.type === "bad_luck") {
    return {
      playerId,
      tileIndex: tile.index,
      tileType: tile.type,
      title: "Casa do Azar",
      description: "Você caiu em uma casa de azar. Execute para revelar a penalidade!"
    };
  }

  if (tile.type === "special_event") {
    return {
      playerId,
      tileIndex: tile.index,
      tileType: tile.type,
      title: "Evento Especial",
      description: "Bônus de evento especial disponível."
    };
  }

  return {
    playerId,
    tileIndex: tile.index,
    tileType: tile.type,
    title: "Casa Neutra",
    description: "Nenhuma ação obrigatória nessa casa."
  };
}

export function processTimeoutIfNeeded() {
  const state = getState();
  if (state.status !== "running" || !state.turnDeadline || Date.now() <= state.turnDeadline) return;

  if (state.pendingTileAction && state.currentTurnPlayerId) {
    const pendingPlayerId = state.pendingTileAction.playerId;
    try {
      resolveTileAction({ playerId: pendingPlayerId, buy: false });
    } catch {
      state.pendingTileAction = null;
      addEvent("turn_change", "Tempo esgotado durante ação da casa. Turno encerrado automaticamente.");
      advanceTurn("Automatic skip due to timeout.");
      markUpdated();
    }
    return;
  }

  addEvent("turn_change", "Time expired. Turn skipped automatically.");
  advanceTurn("Automatic skip due to timeout.");
  markUpdated();
}

export function requestJoin(payload: unknown) {
  const state = getState();
  const data = joinSchema.parse(payload);

  if (state.status === "waiting") {
    const playerId = crypto.randomUUID();
    state.players.push({
      id: playerId,
      name: data.name,
      coins: 1000,
      position: 0,
      isHost: state.players.length === 0,
      isBankrupt: false,
      properties: [],
      joinedAt: Date.now()
    });
    addEvent("request_join", `${data.name} joined the lobby.`);
    markUpdated();
    return { joined: true, playerId };
  }

  if (state.status === "running") {
    if (state.pendingJoinRequest) throw new Error("Another join vote is already in progress");
    const requestId = crypto.randomUUID();
    state.pendingJoinRequest = {
      id: requestId,
      name: data.name,
      createdAt: Date.now(),
      votes: Object.fromEntries(state.players.map((player) => [player.id, null]))
    };
    addEvent("request_join", `${data.name} requested to join. Vote required.`);
    markUpdated();
    return { joined: false, requestId };
  }

  throw new Error("Game already finished");
}

export function voteJoin(payload: unknown) {
  const state = getState();
  const data = voteSchema.parse(payload);
  if (!state.pendingJoinRequest) throw new Error("No pending join request");
  assertPlayer(data.playerId);

  if (!(data.playerId in state.pendingJoinRequest.votes)) {
    throw new Error("Player cannot vote on this request");
  }

  state.pendingJoinRequest.votes[data.playerId] = data.approve;

  const votes = Object.values(state.pendingJoinRequest.votes);
  if (votes.includes(false)) {
    addEvent("vote_join", `Join request for ${state.pendingJoinRequest.name} was rejected.`);
    state.pendingJoinRequest = null;
    markUpdated();
    return { approved: false };
  }

  if (votes.every((vote) => vote === true)) {
    const playerId = crypto.randomUUID();
    state.players.push({
      id: playerId,
      name: state.pendingJoinRequest.name,
      coins: 1000,
      position: 0,
      isHost: false,
      isBankrupt: false,
      properties: [],
      joinedAt: Date.now()
    });
    addEvent("vote_join", `${state.pendingJoinRequest.name} was approved unanimously and joined.`);
    state.pendingJoinRequest = null;
    markUpdated();
    return { approved: true, playerId };
  }

  markUpdated();
  return { approved: null };
}

export function startGame(payload: unknown) {
  const state = getState();
  const data = playerSchema.parse(payload);
  const host = assertPlayer(data.playerId);

  if (!host.isHost) throw new Error("Only the host can start the game");
  if (state.status !== "waiting") throw new Error("Game already started");
  if (state.players.length < 2) throw new Error("Need at least 2 players to start");

  state.players.sort(() => crypto.randomInt(0, 2) - 1);
  state.currentTurnPlayerId = state.players[0].id;
  state.status = "running";
  state.turnDeadline = Date.now() + 30000;
  state.pendingTileAction = null;
  addEvent("start_game", "The game has started!");
  markUpdated();
}

export function rollDice(payload: unknown) {
  const state = getState();
  const data = playerSchema.parse(payload);
  processTimeoutIfNeeded();

  if (state.status !== "running") throw new Error("Game is not running");
  if (state.currentTurnPlayerId !== data.playerId) throw new Error("Not your turn");
  if (state.pendingTileAction) throw new Error("Resolve the current tile action first");

  const key = turnKey();
  if (state.lastProcessedTurnKey === key) throw new Error("This turn action was already processed");

  const roll = crypto.randomInt(1, 7);
  movePlayer(data.playerId, roll);

  state.lastProcessedTurnKey = key;
  state.lastRoll = { playerId: data.playerId, value: roll };
  state.pendingTileAction = buildPendingAction(data.playerId);

  addEvent("roll_dice", `${assertPlayer(data.playerId).name} rolled ${roll}.`);
  markUpdated();

  return { roll };
}

export function resolveTileAction(payload: unknown) {
  const state = getState();
  const data = resolveSchema.parse(payload);
  const player = assertPlayer(data.playerId);

  if (state.status !== "running") throw new Error("Game is not running");
  if (state.currentTurnPlayerId !== data.playerId) throw new Error("Not your turn");
  if (!state.pendingTileAction) throw new Error("No pending tile action");
  if (state.pendingTileAction.playerId !== data.playerId) throw new Error("Pending action belongs to another player");

  let actionMessage = "";

  if (state.pendingTileAction.tileType === "property" && state.pendingTileAction.propertyId) {
    const property = state.properties.find((item) => item.id === state.pendingTileAction?.propertyId);
    if (!property) throw new Error("Property not found");

    if (!property.ownerId && data.buy) {
      if (player.coins < property.value) throw new Error("Insufficient balance to buy this property");
      player.coins -= property.value;
      player.properties.push(property.id);
      property.ownerId = player.id;
      actionMessage = `Propriedade comprada: ${property.name} por ${property.value} moedas.`;
      addEvent("buy_property", `${player.name} bought ${property.name} for ${property.value}.`);
    } else if (!property.ownerId) {
      actionMessage = `Você decidiu não comprar ${property.name}.`;
      addEvent("event_triggered", `${player.name} skipped buying ${property.name}.`);
    } else if (property.ownerId !== player.id) {
      const rent = property.rent + property.level * 35;
      player.coins -= rent;
      const owner = state.players.find((item) => item.id === property.ownerId);
      if (owner) owner.coins += rent;
      actionMessage = `Aluguel pago: ${rent} moedas para ${property.name}.`;
      addEvent("event_triggered", `${player.name} paid ${rent} in rent for ${property.name}.`);
    } else {
      actionMessage = `Você caiu na sua própria propriedade ${property.name}.`;
      addEvent("event_triggered", `${player.name} landed on owned property ${property.name}.`);
    }
  } else if (state.pendingTileAction.tileType === "luck" || state.pendingTileAction.tileType === "bad_luck") {
    actionMessage = triggerRandomEvent(state, state.pendingTileAction.tileType, data.playerId);
    addEvent("event_triggered", actionMessage);
  } else if (state.pendingTileAction.tileType === "special_event") {
    player.coins += 100;
    actionMessage = "Evento especial: +100 moedas.";
    addEvent("event_triggered", `${player.name} gained +100 from a special event.`);
  } else {
    actionMessage = "Casa neutra: nenhum efeito.";
    addEvent("event_triggered", `${player.name} landed on a neutral tile.`);
  }

  state.pendingTileAction = null;
  eliminateBankruptPlayers();
  advanceTurn();
  markUpdated();

  return { resolved: true, actionMessage };
}

export function buyProperty(payload: unknown) {
  const state = getState();
  const data = propertySchema.parse(payload);

  if (state.status !== "running") throw new Error("Game is not running");
  if (state.currentTurnPlayerId !== data.playerId) throw new Error("Not your turn");

  const player = assertPlayer(data.playerId);
  const property = state.properties.find((item) => item.id === data.propertyId);
  if (!property) throw new Error("Property not found");
  if (property.ownerId) throw new Error("Property already owned");
  if (player.coins < property.value) throw new Error("Insufficient balance");
  if (state.board[player.position].propertyId !== property.id) throw new Error("Player must be on the property tile");

  player.coins -= property.value;
  player.properties.push(property.id);
  property.ownerId = player.id;
  addEvent("buy_property", `${player.name} bought ${property.name} for ${property.value}.`);
  markUpdated();
}

export function upgradeProperty(payload: unknown) {
  const state = getState();
  const data = propertySchema.parse(payload);

  const player = assertPlayer(data.playerId);
  const property = state.properties.find((item) => item.id === data.propertyId);
  if (!property) throw new Error("Property not found");
  if (property.ownerId !== player.id) throw new Error("Not the owner");

  const cost = Math.floor(property.value * 0.5) + property.level * 80;
  if (player.coins < cost) throw new Error("Insufficient balance");

  player.coins -= cost;
  property.level += 1;
  addEvent("upgrade_property", `${player.name} upgraded ${property.name} to level ${property.level}.`);
  markUpdated();
}
