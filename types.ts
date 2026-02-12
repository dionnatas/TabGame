export type GameStatus = "waiting" | "running" | "finished";
export type TileType = "property" | "luck" | "bad_luck" | "special_event" | "neutral";

export interface Property {
  id: string;
  name: string;
  country: string;
  value: number;
  rent: number;
  ownerId: string | null;
  level: number;
}

export interface Tile {
  id: string;
  index: number;
  type: TileType;
  propertyId?: string;
  label: string;
}

export interface Player {
  id: string;
  name: string;
  coins: number;
  position: number;
  isHost: boolean;
  isBankrupt: boolean;
  properties: string[];
  joinedAt: number;
}

export interface JoinRequest {
  id: string;
  name: string;
  createdAt: number;
  votes: Record<string, boolean | null>;
}

export interface GameEvent {
  id: string;
  type: string;
  message: string;
  createdAt: number;
}

export interface GameState {
  status: GameStatus;
  players: Player[];
  board: Tile[];
  properties: Property[];
  currentTurnPlayerId: string | null;
  round: number;
  pendingJoinRequest: JoinRequest | null;
  turnDeadline: number | null;
  lastProcessedTurnKey: string | null;
  events: GameEvent[];
  winnerId: string | null;
  updatedAt: number;
}

export interface PublicGameState extends GameState {
  netWorthByPlayer: Record<string, number>;
}
