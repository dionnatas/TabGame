"use client";

import { create } from "zustand";
import { PublicGameState } from "@/types";
import { fetchState, sendAction } from "./api";

interface GameStore {
  playerId: string | null;
  playerName: string;
  state: PublicGameState | null;
  error: string | null;
  setPlayerName: (name: string) => void;
  setPlayerId: (playerId: string | null) => void;
  sync: () => Promise<void>;
  action: (action: string, payload: Record<string, unknown>) => Promise<void>;
  resetLocalPlayer: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerId: null,
  playerName: "",
  state: null,
  error: null,
  setPlayerName: (name) => set({ playerName: name }),
  setPlayerId: (playerId) => set({ playerId }),
  resetLocalPlayer: () => {
    localStorage.removeItem("tabgame_player_id");
    set({ playerId: null });
  },
  sync: async () => {
    const data = await fetchState();
    if (!data.ok || !data.state) {
      set({ error: data.error ?? "Could not fetch game state" });
      return;
    }

    const localPlayerId = get().playerId;
    if (localPlayerId) {
      const stillPresent = data.state.players.some((player) => player.id === localPlayerId);
      if (!stillPresent) {
        localStorage.removeItem("tabgame_player_id");
        set({ playerId: null });
      }
    }

    set({ state: data.state, error: null });
  },
  action: async (actionName, payload) => {
    const data = await sendAction(actionName, payload);
    if (!data.ok) {
      set({ error: data.error ?? "Action failed" });
      return;
    }

    const result = data.result as { playerId?: string } | undefined;
    const nextPlayerId = result?.playerId ?? get().playerId;
    if (result?.playerId) {
      localStorage.setItem("tabgame_player_id", result.playerId);
    }

    set({ state: data.state ?? get().state, playerId: nextPlayerId, error: null });
  }
}));
