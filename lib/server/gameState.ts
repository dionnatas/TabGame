import { GameEvent, GameState, PublicGameState } from "@/types";
import { generateBoard } from "./boardGenerator";

const { board, properties } = generateBoard();

const state: GameState = {
  status: "waiting",
  players: [],
  board,
  properties,
  currentTurnPlayerId: null,
  round: 1,
  pendingJoinRequest: null,
  pendingTileAction: null,
  turnDeadline: null,
  lastProcessedTurnKey: null,
  lastRoll: null,
  events: [],
  winnerId: null,
  updatedAt: Date.now()
};

export function getState() {
  return state;
}

export function addEvent(type: string, message: string) {
  const event: GameEvent = {
    id: crypto.randomUUID(),
    type,
    message,
    createdAt: Date.now()
  };
  state.events = [event, ...state.events].slice(0, 30);
}

export function markUpdated() {
  state.updatedAt = Date.now();
}

export function netWorthForPlayer(playerId: string) {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return 0;

  const ownedValue = state.properties
    .filter((property) => property.ownerId === playerId)
    .reduce((sum, property) => sum + property.value + property.level * 100, 0);

  return player.coins + ownedValue;
}

export function toPublicState(): PublicGameState {
  return {
    ...state,
    netWorthByPlayer: Object.fromEntries(state.players.map((player) => [player.id, netWorthForPlayer(player.id)]))
  };
}
