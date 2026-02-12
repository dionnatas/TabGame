import { NextRequest, NextResponse } from "next/server";
import {
  buyProperty,
  processTimeoutIfNeeded,
  requestJoin,
  resolveTileAction,
  rollDice,
  startGame,
  upgradeProperty,
  voteJoin
} from "@/lib/server/gameEngine";
import { toPublicState } from "@/lib/server/gameState";

export const dynamic = "force-dynamic";

export async function GET() {
  processTimeoutIfNeeded();
  return NextResponse.json({ ok: true, state: toPublicState() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;
    let result: unknown = null;

    switch (action) {
      case "request_join":
        result = requestJoin(body.payload);
        break;
      case "vote_join":
        result = voteJoin(body.payload);
        break;
      case "start_game":
        result = startGame(body.payload);
        break;
      case "roll_dice":
        result = rollDice(body.payload);
        break;
      case "resolve_tile":
        result = resolveTileAction(body.payload);
        break;
      case "buy_property":
        result = buyProperty(body.payload);
        break;
      case "upgrade_property":
        result = upgradeProperty(body.payload);
        break;
      default:
        throw new Error("Unsupported action");
    }

    processTimeoutIfNeeded();
    return NextResponse.json({ ok: true, result, state: toPublicState() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
