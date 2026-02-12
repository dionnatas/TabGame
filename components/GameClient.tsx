"use client";

import { useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/client/store";

const PIN_COLORS = [
  "#f43f5e",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#d946ef",
  "#f97316",
  "#84cc16",
  "#8b5cf6"
];

function tileColor(type: string) {
  if (type === "property") return "#facc15";
  if (type === "luck") return "#22c55e";
  if (type === "bad_luck") return "#ef4444";
  if (type === "special_event") return "#a855f7";
  return "#e2e8f0";
}

function trackPoint(index: number, total: number) {
  const t = index / Math.max(1, total - 1);
  const x = 8 + t * 84;
  const y = 70 - 22 * Math.sin(t * Math.PI * 1.25) - t * 22;
  const scale = 1.2 - t * 0.65;
  return { x, y, scale };
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">TabGame: Multiplayer Landmark Tycoon</h1>
        <p className="text-slate-300">Visual board style with scenic track + moving player pins.</p>
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
            className="rounded bg-cyan-300 text-slate-900 px-4 py-2 font-semibold"
            onClick={() => action("request_join", { name: playerName })}
          >
            Join / Request Join
          </button>
        </section>
      )}

      {state && (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl bg-slate-900 p-4 lg:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Partida: {state.status}</h2>
              <p className="text-sm text-slate-300">Round {state.round}/15</p>
            </div>
            <p>Turno de: {state.players.find((player) => player.id === state.currentTurnPlayerId)?.name ?? "-"}</p>

            <div className="flex flex-wrap gap-2">
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
              <div className="rounded bg-slate-800 p-3 space-y-2">
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

          <article className="rounded-2xl bg-violet-700/90 p-4 space-y-2">
            <h3 className="font-semibold text-white">Players</h3>
            {state.players.map((player, idx) => (
              <div key={player.id} className="rounded bg-white/95 p-2 text-sm text-slate-900">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black" style={{ backgroundColor: PIN_COLORS[idx % PIN_COLORS.length] }} />
                  {player.name} {player.isHost ? "(Host)" : ""}
                </p>
                <p>Coins: {player.coins}</p>
                <p>Net Worth: {state.netWorthByPlayer[player.id] ?? 0}</p>
                <p>Casa atual: #{player.position}</p>
              </div>
            ))}
          </article>
        </section>
      )}

      {state && (
        <section className="rounded-2xl p-3 bg-slate-900">
          <h3 className="font-semibold mb-3">Tabuleiro visual (estilo cena)</h3>
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl border-4 border-slate-700 bg-gradient-to-b from-sky-300 via-cyan-300 to-lime-400">
            <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-lime-700/70 via-lime-500/50 to-transparent" />
            <div className="absolute right-[8%] top-[22%] h-24 w-40 rounded-sm bg-orange-200 shadow-lg border-2 border-slate-500" />
            <div className="absolute right-[11%] top-[17%] h-8 w-46 -rotate-6 bg-orange-500 shadow" />
            <div className="absolute left-[12%] top-[30%] h-20 w-32 rounded-sm bg-sky-200 shadow-lg border-2 border-slate-500" />
            <div className="absolute left-[14%] top-[24%] h-7 w-34 -rotate-6 bg-red-500 shadow" />

            <div className="absolute left-0 right-0 bottom-[6%] h-[44%]">
              {state.board.map((tile, idx) => {
                const p = trackPoint(idx, state.board.length);
                const width = 68 * p.scale;
                const height = 44 * p.scale;

                return (
                  <div
                    key={tile.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-white/70 shadow-md"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width,
                      height,
                      backgroundColor: tileColor(tile.type),
                      transform: `translate(-50%, -50%) perspective(600px) rotateX(40deg)`
                    }}
                    title={`${tile.index} - ${tile.label}`}
                  >
                    <div className="absolute inset-0 bg-white/20" />
                    <span className="absolute left-1 top-0 text-[10px] font-black text-slate-900">{tile.index}</span>
                    {(tile.type === "bad_luck" || tile.type === "special_event") && (
                      <span className="absolute right-1 top-0 text-[10px]">{tile.type === "bad_luck" ? "⚠️" : "✨"}</span>
                    )}
                  </div>
                );
              })}

              {state.players.map((player, playerIndex) => {
                const p = trackPoint(player.position, state.board.length);
                const size = 20 * p.scale;
                const offset = (playerIndex % 4) * 8 - 12;

                return (
                  <div
                    key={player.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                    style={{ left: `${p.x}%`, top: `${p.y - 6}%`, marginLeft: offset }}
                    title={player.name}
                  >
                    <div
                      className="rounded-full border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
                      style={{ width: size, height: size, backgroundColor: PIN_COLORS[playerIndex % PIN_COLORS.length] }}
                    />
                    <div className="mx-auto h-2 w-2 rounded-full bg-black/30" />
                  </div>
                );
              })}
            </div>

            <div className="absolute left-4 top-4 rounded-xl bg-violet-700/95 px-4 py-3 text-white shadow-xl border-2 border-violet-300">
              <p className="font-bold text-sm">🚗 Board Life View</p>
              <p className="text-xs">Pins se movem por posição autoritativa do servidor</p>
            </div>
          </div>
        </section>
      )}

      {state && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl bg-slate-900 p-4 space-y-2 max-h-[360px] overflow-auto">
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

          <article className="rounded-xl bg-slate-900 p-4">
            <h3 className="font-semibold mb-2">Events</h3>
            <div className="space-y-1 text-sm max-h-[360px] overflow-auto">
              {state.events.map((event) => (
                <p key={event.id}>
                  [{new Date(event.createdAt).toLocaleTimeString()}] {event.type}: {event.message}
                </p>
              ))}
            </div>
          </article>
        </section>
      )}

      {error && <p className="rounded bg-red-900 p-3 text-red-100">{error}</p>}
    </main>
  );
}
