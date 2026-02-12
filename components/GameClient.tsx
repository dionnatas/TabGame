"use client";

import { useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/client/store";

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
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
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
            <h3 className="font-semibold">Players</h3>
            {state.players.map((player) => (
              <div key={player.id} className="rounded bg-slate-800 p-2 text-sm">
                <p>
                  {player.name} {player.isHost ? "(Host)" : ""}
                </p>
                <p>Coins: {player.coins}</p>
                <p>Net Worth: {state.netWorthByPlayer[player.id] ?? 0}</p>
              </div>
            ))}
          </article>
        </section>
      )}

      {state && (
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl bg-slate-900 p-4">
            <h3 className="font-semibold mb-2">Board (40 tiles)</h3>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {state.board.map((tile) => (
                <div key={tile.id} className="rounded bg-slate-800 p-2">
                  <p>#{tile.index}</p>
                  <p>{tile.type}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl bg-slate-900 p-4 space-y-2">
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
