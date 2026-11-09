export interface Player {
  id: string; // socket id
  name: string;
  avatarLetter: string;
  score: number;
  isHost: boolean;
  isAlive: boolean;
}

export interface TurnHistoryItem {
  playerId: string;
  playerName: string;
  text: string;
  audioBase64?: string;
  targetLetter: string;
  nextLetter: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'ended';
  currentTurnPlayerId: string | null;
  targetLetter: string;
  turnDeadline: number | null; // timestamp ms
  history: TurnHistoryItem[];
  usedPhrases: string[];
  maxTurns?: number;
  winner?: Player | null;
}
