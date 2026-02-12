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
  sync: () => Promise<void>;
  action: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerId: null,
  playerName: "",
  state: null,
  error: null,
  setPlayerName: (name) => set({ playerName: name }),
  sync: async () => {
    const data = await fetchState();
    if (!data.ok || !data.state) {
      set({ error: data.error ?? "Could not fetch game state" });
      return;
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
