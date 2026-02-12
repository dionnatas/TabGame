# TabGame - Serverless Multiplayer Board Game

TabGame is a startup-ready, browser-based multiplayer board game inspired by The Game of Life 2, Mario Party, and Monopoly. It uses a **server-authoritative game engine** and is designed to deploy entirely on Vercel free tier.

## Stack

- **Frontend:** Next.js (React + TypeScript + TailwindCSS)
- **State (client):** Zustand
- **Backend:** Next.js Route Handlers as Vercel Serverless Functions
- **Validation:** Zod
- **Realtime approach:** Polling fallback (2-second sync) compatible with serverless constraints

## Gameplay Features Implemented

- Single active game instance in memory.
- No auth; players join with a name.
- First player becomes host.
- Host starts match.
- Running match join requests require unanimous active player approval.
- 40-tile circular board generated server-side.
- Landmark properties including:
  - Cristo Redentor
  - Torre Eiffel
  - Taj Mahal
  - Grande Muralha da China
  - Coliseu
  - Machu Picchu
  - Pirâmides de Gizé
- Property purchase and upgrade system.
- Luck, bad luck, and special events.
- Initial balance 1000.
- Lap completion bonus +300.
- 30-second turn timer with automatic skip.
- Turn ownership checks and anti-double-processing guard.
- End conditions:
  - Round > 15
  - Or only one player has positive balance

## API Events

All events are POSTed to `/api/game` using `{ action, payload }`:

- `request_join`
- `vote_join`
- `start_game`
- `roll_dice`
- `buy_property`
- `upgrade_property`

State sync via:

- `GET /api/game`

The API response includes `state` and an events log that maps to:

- request_join
- vote_join
- start_game
- roll_dice
- buy_property
- upgrade_property
- event_triggered
- turn_change
- game_over
- game_update (represented through periodic state sync)

## Local Development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploy to Vercel (Free Plan)

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Framework preset: **Next.js**.
4. Build command: `npm run build`
5. Output: default Next.js output.
6. Deploy.

No mandatory environment variables are required for this startup version.

## Serverless Constraints & Fallback Strategy

Because Vercel serverless functions are stateless between cold starts:

- In-memory game state persists only while function instance stays warm.
- A cold start can reset game state.

Fallback strategy implemented:

- Lightweight polling every 2 seconds from client to refresh authoritative state.
- Engine is fully server-authoritative on every action call.

Recommended future hardening:

- Move state to Redis / KV for cross-instance persistence.
- Add event bus / websocket provider (e.g., Ably/Pusher) for lower latency.

## Environment Configuration

Current version requires no env vars.

Optional future env examples:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ABLY_API_KEY`

## Suggested Folder Structure

- `app/` frontend + API route handlers
- `components/` UI modules
- `lib/client/` API and store
- `lib/server/` game engine modules
- `types.ts` shared contracts

## Future Roadmap

- Multiplayer rooms and lobby discovery
- Persistent database and recovery of active matches
- Player accounts and identity
- ELO / ranking ladder
- Mini-games between rounds
- Advanced economy balancing, auctions, and trading
