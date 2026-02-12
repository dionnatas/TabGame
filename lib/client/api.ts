import { PublicGameState } from "@/types";

interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  result?: T;
  state?: PublicGameState;
}

export async function fetchState() {
  const res = await fetch("/api/game", { cache: "no-store" });
  return (await res.json()) as ApiResponse;
}

export async function sendAction(action: string, payload: unknown) {
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload })
  });

  return (await res.json()) as ApiResponse;
}
