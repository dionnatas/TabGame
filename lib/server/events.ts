import crypto from "node:crypto";
import { GameState } from "@/types";

interface EventEffect {
  message: string;
  apply: (state: GameState, playerId: string) => void;
}

const luckEvents: EventEffect[] = [
  {
    message: "Lucky investment! +200 coins.",
    apply: (state, playerId) => {
      const player = state.players.find((item) => item.id === playerId);
      if (player) player.coins += 200;
    }
  },
  {
    message: "Tailwind bonus! Advance 3 tiles.",
    apply: (state, playerId) => {
      const player = state.players.find((item) => item.id === playerId);
      if (player) player.position = (player.position + 3) % state.board.length;
    }
  },
  {
    message: "Global tourism boom! Everyone gets +80 coins.",
    apply: (state) => {
      state.players.forEach((player) => {
        player.coins += 80;
      });
    }
  }
];

const badLuckEvents: EventEffect[] = [
  {
    message: "Unexpected taxes: -150 coins.",
    apply: (state, playerId) => {
      const player = state.players.find((item) => item.id === playerId);
      if (player) player.coins -= 150;
    }
  },
  {
    message: "Property damage! Lose a random property.",
    apply: (state, playerId) => {
      const player = state.players.find((item) => item.id === playerId);
      if (!player || player.properties.length === 0) return;
      const index = crypto.randomInt(0, player.properties.length);
      const propertyId = player.properties.splice(index, 1)[0];
      const property = state.properties.find((item) => item.id === propertyId);
      if (property) {
        property.ownerId = null;
        property.level = 0;
      }
    }
  },
  {
    message: "Global crisis: all players lose 10% of coins.",
    apply: (state) => {
      state.players.forEach((player) => {
        player.coins = Math.floor(player.coins * 0.9);
      });
    }
  }
];

export function triggerRandomEvent(state: GameState, type: "luck" | "bad_luck", playerId: string) {
  const source = type === "luck" ? luckEvents : badLuckEvents;
  const selected = source[crypto.randomInt(0, source.length)];
  selected.apply(state, playerId);
  return selected.message;
}
