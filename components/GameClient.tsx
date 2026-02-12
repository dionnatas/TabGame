"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/lib/client/store";

const BOARD_SIZE = 11;
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

function tileClasses(type: string) {
  if (type === "property") return "bg-yellow-300 text-yellow-950 border-yellow-100";
  if (type === "luck") return "bg-emerald-400 text-emerald-950 border-emerald-100";
  if (type === "bad_luck") return "bg-rose-400 text-rose-950 border-rose-100";
  if (type === "special_event") return "bg-violet-400 text-violet-950 border-violet-100";
  return "bg-slate-200 text-slate-900 border-slate-50";
}

function indexToCoord(index: number) {
  if (index <= 10) return { row: 10, col: 10 - index };
  if (index <= 20) return { row: 10 - (index - 10), col: 0 };
  if (index <= 30) return { row: 0, col: index - 20 };
  return { row: index - 30, col: 10 };
}

export function GameClient() {
  const { playerId, playerName, state, error, setPlayerName, setPlayerId, resetLocalPlayer, sync, action } = useGameStore();
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceFace, setDiceFace] = useState<number | null>(null);
  const [centerNotice, setCenterNotice] = useState<string | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("tabgame_player_id");
    if (cached) setPlayerId(cached);
    sync();
    const timer = setInterval(sync, 2000);
    return () => clearInterval(timer);
  }, [setPlayerId, sync]);

  const me = useMemo(() => state?.players.find((player) => player.id === playerId), [state, playerId]);
  const myTurn = state?.currentTurnPlayerId === playerId;

  const gridMap = useMemo(() => {
    if (!state) return new Map<string, number>();
    return new Map(
      state.board.map((tile) => {
        const pos = indexToCoord(tile.index);
        return [`${pos.row}-${pos.col}`, tile.index];
      })
    );
  }, [state]);

  const canJoin = !playerId || !me;
  const myPendingAction = state?.pendingTileAction && state.pendingTileAction.playerId === playerId ? state.pendingTileAction : null;

  async function handleRollDice() {
    if (!playerId || !myTurn || diceRolling) return;

    setDiceRolling(true);
    setCenterNotice(null);
    const interval = setInterval(() => setDiceFace(Math.floor(Math.random() * 6) + 1), 90);

    const result = (await action("roll_dice", { playerId }, 1000)) as { roll?: number } | null;

    clearInterval(interval);
    const finalValue = result?.roll ?? 1;
    setDiceFace(finalValue);
    setCenterNotice(`Resultado do dado: ${finalValue}`);
    setTimeout(() => {
      setCenterNotice(null);
      setDiceRolling(false);
    }, 1000);
  }

  async function handleResolveTile(buy?: boolean) {
    if (!playerId || !myPendingAction) return;
    const result = (await action("resolve_tile", { playerId, buy })) as { actionMessage?: string } | null;
    if (result?.actionMessage) {
      setCenterNotice(result.actionMessage);
      setTimeout(() => setCenterNotice(null), 1600);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <header className="rounded-2xl bg-slate-900 p-4">
        <h1 className="text-3xl font-bold">TabGame: Multiplayer Landmark Tycoon</h1>
        <p className="text-slate-300">Animação de dado + ação da casa no centro do tabuleiro.</p>
      </header>

      {canJoin && (
        <section className="rounded-2xl bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Entrar no jogo</h2>
            {playerId && !me && (
              <button className="rounded bg-slate-700 px-3 py-1 text-sm" onClick={resetLocalPlayer}>
                Limpar sessão local
              </button>
            )}
          </div>

          <input
            className="w-full rounded border border-slate-700 bg-slate-950 p-2"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Digite seu nome"
          />

          <button
            className="rounded bg-cyan-300 text-slate-900 px-4 py-2 font-semibold disabled:opacity-50"
            disabled={playerName.trim().length < 2}
            onClick={() => action("request_join", { name: playerName.trim() })}
          >
            Entrar / Solicitar entrada
          </button>
        </section>
      )}

      {state && (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl bg-slate-900 p-4 lg:col-span-2 space-y-2">
            <h2 className="text-lg font-semibold">Status: {state.status}</h2>
            <p>Round: {state.round}/15</p>
            <p>Turno atual: {state.players.find((player) => player.id === state.currentTurnPlayerId)?.name ?? "-"}</p>

            <div className="flex flex-wrap gap-2 pt-1">
              {me?.isHost && state.status === "waiting" && (
                <button className="rounded bg-emerald-400 text-black px-3 py-1" onClick={() => action("start_game", { playerId })}>
                  Iniciar jogo
                </button>
              )}

              {myTurn && state.status === "running" && !state.pendingTileAction && (
                <button className="rounded bg-indigo-400 text-black px-3 py-1" onClick={handleRollDice}>
                  Rolar dado
                </button>
              )}
            </div>

            {state.pendingJoinRequest && (
              <div className="mt-2 rounded bg-slate-800 p-3 space-y-2">
                <p>
                  Solicitação pendente: <strong>{state.pendingJoinRequest.name}</strong>
                </p>
                {me && (
                  <div className="flex gap-2">
                    <button className="rounded bg-emerald-500 text-black px-3 py-1" onClick={() => action("vote_join", { playerId, approve: true })}>
                      Aprovar
                    </button>
                    <button className="rounded bg-rose-500 text-black px-3 py-1" onClick={() => action("vote_join", { playerId, approve: false })}>
                      Rejeitar
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
                  <span className={`inline-block h-3 w-3 rounded-full ring-1 ring-black ${PIN_COLORS[idx % PIN_COLORS.length]}`} />
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
        <section className="rounded-2xl bg-slate-900 p-4">
          <h3 className="font-semibold mb-3">Tabuleiro (caminho jogável)</h3>
          <div className="relative rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-sky-900 to-lime-900 p-3">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}>
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
                const row = Math.floor(i / BOARD_SIZE);
                const col = i % BOARD_SIZE;
                const tileIndex = gridMap.get(`${row}-${col}`);

                if (tileIndex === undefined) {
                  const isCenter = row >= 2 && row <= 8 && col >= 2 && col <= 8;
                  return (
                    <div key={`c-${row}-${col}`} className={`aspect-square rounded ${isCenter ? "bg-slate-900/50" : "bg-slate-950/30"}`}>
                      {isCenter && row === 5 && col === 5 && (
                        <div className="h-full w-full grid place-items-center text-center text-xs text-slate-200 px-1">
                          🎲 Centro de animação e ações
                        </div>
                      )}
                    </div>
                  );
                }

                const tile = state.board[tileIndex];
                const playersHere = state.players.filter((player) => player.position === tile.index);

                return (
                  <div key={tile.id} className={`relative aspect-square rounded border-2 p-1 ${tileClasses(tile.type)}`} title={`${tile.index} - ${tile.label}`}>
                    <p className="text-[10px] font-black">#{tile.index}</p>
                    <p className="text-[9px] leading-tight line-clamp-2">{tile.label}</p>
                    <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1">
                      {playersHere.map((player) => {
                        const idx = state.players.findIndex((item) => item.id === player.id);
                        return <span key={player.id} className={`h-3 w-3 rounded-full ring-1 ring-black ${PIN_COLORS[idx % PIN_COLORS.length]}`} title={player.name} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {(diceRolling || centerNotice || myPendingAction) && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="pointer-events-auto w-[min(92%,420px)] rounded-2xl border-2 border-cyan-300 bg-slate-950/95 p-4 text-center shadow-2xl">
                  <h4 className="font-semibold text-cyan-300">Centro do Tabuleiro</h4>

                  {(diceRolling || centerNotice) && (
                    <div className="mt-3 rounded-xl bg-slate-900 p-3">
                      <p className="text-sm text-slate-300">Dado</p>
                      <div className="mx-auto mt-2 grid h-16 w-16 place-items-center rounded-xl border-2 border-slate-400 bg-white text-3xl font-black text-slate-900">
                        {diceFace ?? "?"}
                      </div>
                      {diceRolling && <p className="mt-2 text-sm text-cyan-300 animate-pulse">Jogando dado...</p>}
                      {centerNotice && <p className="mt-2 text-sm text-emerald-300">{centerNotice}</p>}
                    </div>
                  )}

                  {myPendingAction && (
                    <div className="mt-3 rounded-xl bg-slate-900 p-3 text-left">
                      <p className="font-semibold text-amber-300">{myPendingAction.title}</p>
                      <p className="text-sm text-slate-200 mt-1">{myPendingAction.description}</p>

                      {myPendingAction.tileType === "property" && myPendingAction.canBuy ? (
                        <div className="mt-3 flex gap-2 justify-center">
                          <button className="rounded bg-emerald-500 px-3 py-1 text-black font-semibold" onClick={() => handleResolveTile(true)}>
                            Comprar? Sim
                          </button>
                          <button className="rounded bg-rose-500 px-3 py-1 text-black font-semibold" onClick={() => handleResolveTile(false)}>
                            Comprar? Não
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 flex justify-center">
                          <button className="rounded bg-indigo-400 px-3 py-1 text-black font-semibold" onClick={() => handleResolveTile(false)}>
                            Executar ação
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {state && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl bg-slate-900 p-4 space-y-2 max-h-[380px] overflow-auto">
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
                {myTurn && me?.id === property.ownerId && !state.pendingTileAction && (
                  <button className="mt-1 rounded bg-amber-400 text-black px-2 py-1" onClick={() => action("upgrade_property", { playerId, propertyId: property.id })}>
                    Upgrade
                  </button>
                )}
              </div>
            ))}
          </article>

          <article className="rounded-xl bg-slate-900 p-4">
            <h3 className="font-semibold mb-2">Eventos</h3>
            <div className="space-y-1 text-sm max-h-[380px] overflow-auto">
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
