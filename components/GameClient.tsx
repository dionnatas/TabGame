"use client";

import { useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/client/store";

const BOARD_SIDE = 11;
const PIN_COLORS = [
  "bg-rose-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-400",
  "bg-fuchsia-500",
  "bg-orange-500",
  "bg-lime-500",
  "bg-violet-500"
];

function indexToCoord(index: number) {
  if (index <= 10) return { row: 10, col: 10 - index };
  if (index <= 20) return { row: 10 - (index - 10), col: 0 };
  if (index <= 30) return { row: 0, col: index - 20 };
  return { row: index - 30, col: 10 };
}

function tileTone(type: string) {
  if (type === "property") return "border-cyan-400/70 bg-cyan-900/40";
  if (type === "luck") return "border-emerald-400/70 bg-emerald-900/30";
  if (type === "bad_luck") return "border-rose-400/70 bg-rose-900/30";
  if (type === "special_event") return "border-amber-300/70 bg-amber-900/30";
  return "border-slate-600 bg-slate-800/80";
}

export function GameClient() {
  const { playerId, playerName, state, error, setPlayerName, sync, action } = useGameStore();

  useEffect(() => {
    const cached = localStorage.getItem("tabgame_player_id");
    if (cached) useGameStore.setState({ playerId: cached });
    sync();
    const timer = setInterval(sync, 2000);
    return () => clearInterval(timer);
  }, [sync]);

  const me = useMemo(() => state?.players.find((player) => player.id === playerId), [state, playerId]);
  const myTurn = state?.currentTurnPlayerId === playerId;

  const tileKeyByIndex = useMemo(() => {
    if (!state) return new Map<string, number>();
    return new Map(state.board.map((tile) => {
      const coord = indexToCoord(tile.index);
      return [`${coord.row}-${coord.col}`, tile.index];
    }));
  }, [state]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">TabGame: Multiplayer Landmark Tycoon</h1>
        <p className="text-slate-300">Server-authoritative board game with polling fallback for Vercel serverless.</p>
      </header>

      {!playerId && (
        <section className="rounded-xl bg-slate-900 p-4 space-y-3">
          <h2 className="text-xl font-semibold">Join Game</h2>
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 p-2"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
          />
          <button
            className="rounded bg-accent text-slate-900 px-4 py-2 font-semibold"
            onClick={() => action("request_join", { name: playerName })}
          >
            Join / Request Join
          </button>
        </section>
      )}

      {state && (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl bg-slate-900 p-4 md:col-span-2 space-y-2">
            <h2 className="text-lg font-semibold">Game Status: {state.status}</h2>
            <p>Round: {state.round} / 15</p>
            <p>Current turn: {state.players.find((player) => player.id === state.currentTurnPlayerId)?.name ?? "-"}</p>
            <p>Turn deadline: {state.turnDeadline ? new Date(state.turnDeadline).toLocaleTimeString() : "-"}</p>

            <div className="flex flex-wrap gap-2 pt-2">
              {me?.isHost && state.status === "waiting" && (
                <button className="rounded bg-emerald-400 text-black px-3 py-1" onClick={() => action("start_game", { playerId })}>
                  Start Game
                </button>
              )}
              {myTurn && state.status === "running" && (
                <button className="rounded bg-indigo-400 text-black px-3 py-1" onClick={() => action("roll_dice", { playerId })}>
                  Roll Dice
                </button>
              )}
            </div>

            {state.pendingJoinRequest && (
              <div className="mt-3 rounded bg-slate-800 p-3 space-y-2">
                <p>
                  Join request: <strong>{state.pendingJoinRequest.name}</strong>
                </p>
                {playerId && state.players.some((player) => player.id === playerId) && (
                  <div className="flex gap-2">
                    <button className="rounded bg-emerald-500 text-black px-3 py-1" onClick={() => action("vote_join", { playerId, approve: true })}>
                      Approve
                    </button>
                    <button className="rounded bg-rose-500 text-black px-3 py-1" onClick={() => action("vote_join", { playerId, approve: false })}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </article>

          <article className="rounded-xl bg-slate-900 p-4 space-y-3">
            <h3 className="font-semibold">Players (pins)</h3>
            {state.players.map((player, idx) => (
              <div key={player.id} className="rounded bg-slate-800 p-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded-full ${PIN_COLORS[idx % PIN_COLORS.length]}`} />
                  {player.name} {player.isHost ? "(Host)" : ""}
                </p>
                <p>Coins: {player.coins}</p>
                <p>Net Worth: {state.netWorthByPlayer[player.id] ?? 0}</p>
                <p>Posição: casa #{player.position}</p>
              </div>
            ))}
          </article>
        </section>
      )}

      {state && (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl bg-slate-900 p-4 lg:col-span-2">
            <h3 className="font-semibold mb-3">Tabuleiro (caminho com 40 casas + pins)</h3>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${BOARD_SIDE}, minmax(0, 1fr))` }}>
              {Array.from({ length: BOARD_SIDE * BOARD_SIDE }, (_, cellIndex) => {
                const row = Math.floor(cellIndex / BOARD_SIDE);
                const col = cellIndex % BOARD_SIDE;
                const tileIndex = tileKeyByIndex.get(`${row}-${col}`);

                if (tileIndex === undefined) {
                  const isCenter = row >= 3 && row <= 7 && col >= 3 && col <= 7;
                  return (
                    <div
                      key={`empty-${row}-${col}`}
                      className={`aspect-square rounded ${isCenter ? "bg-slate-800/60 border border-slate-700" : "bg-slate-950/60"}`}
                    >
                      {isCenter && row === 5 && col === 5 && (
                        <div className="h-full w-full grid place-items-center text-center text-[10px] sm:text-xs text-slate-300 px-1">
                          Percorra o caminho<br />e evolua seus monumentos
                        </div>
                      )}
                    </div>
                  );
                }

                const tile = state.board[tileIndex];
                const playersOnTile = state.players.filter((player) => player.position === tile.index);

                return (
                  <div
                    key={tile.id}
                    className={`aspect-square rounded border p-1 text-[9px] sm:text-[10px] relative transition-all ${tileTone(tile.type)}`}
                    title={`${tile.index} - ${tile.label}`}
                  >
                    <p className="font-semibold leading-tight">#{tile.index}</p>
                    <p className="leading-tight line-clamp-2">{tile.label}</p>
                    <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1">
                      {playersOnTile.map((player) => {
                        const playerColorIndex = state.players.findIndex((item) => item.id === player.id);
                        return (
                          <span
                            key={`pin-${tile.id}-${player.id}`}
                            className={`h-3 w-3 rounded-full ring-1 ring-black ${PIN_COLORS[playerColorIndex % PIN_COLORS.length]}`}
                            title={player.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-xl bg-slate-900 p-4 space-y-2 max-h-[640px] overflow-auto">
            <h3 className="font-semibold">Properties</h3>
            {state.properties.map((property) => (
              <div key={property.id} className="rounded bg-slate-800 p-2 text-xs">
                <p className="font-medium">
                  {property.name} ({property.country})
                </p>
                <p>
                  Value {property.value} / Rent {property.rent} / Level {property.level}
                </p>
                <p>Owner: {state.players.find((player) => player.id === property.ownerId)?.name ?? "None"}</p>
                {myTurn && me?.id === property.ownerId && (
                  <button className="mt-1 rounded bg-amber-400 text-black px-2 py-1" onClick={() => action("upgrade_property", { playerId, propertyId: property.id })}>
                    Upgrade
                  </button>
                )}
                {myTurn && me && !property.ownerId && state.board[me.position]?.propertyId === property.id && (
                  <button className="mt-1 ml-2 rounded bg-cyan-400 text-black px-2 py-1" onClick={() => action("buy_property", { playerId, propertyId: property.id })}>
                    Buy
                  </button>
                )}
              </div>
            ))}
          </article>
        </section>
      )}

      {state && (
        <section className="rounded-xl bg-slate-900 p-4">
          <h3 className="font-semibold mb-2">Events</h3>
          <div className="space-y-1 text-sm">
            {state.events.map((event) => (
              <p key={event.id}>
                [{new Date(event.createdAt).toLocaleTimeString()}] {event.type}: {event.message}
              </p>
            ))}
          </div>
        </section>
      )}

      {error && <p className="rounded bg-red-900 p-3 text-red-100">{error}</p>}
    </main>
  );
}
