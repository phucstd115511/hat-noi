import { RoomState, Player } from './types';
import { validateTurn } from './rules';

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  generateRoomCode(): string {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostPlayerName: string, hostSocketId: string): RoomState {
    const code = this.generateRoomCode();
    const host: Player = {
      id: hostSocketId,
      name: hostPlayerName,
      avatarLetter: hostPlayerName.trim().charAt(0).toUpperCase() || 'P',
      score: 0,
      isHost: true,
      isAlive: true
    };

    const room: RoomState = {
      code,
      hostId: hostSocketId,
      players: [host],
      status: 'waiting',
      currentTurnIndex: 0,
      currentTurnPlayerId: null,
      targetLetter: '',
      turnDeadline: null,
      turnDurationSec: 30,
      history: [],
      usedPhrases: []
    };

    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  joinRoom(code: string, playerName: string, socketId: string): { room?: RoomState; error?: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      return { error: 'Phòng không tồn tại!' };
    }
    if (room.status !== 'waiting') {
      return { error: 'Trò chơi trong phòng này đã bắt đầu!' };
    }

    const player: Player = {
      id: socketId,
      name: playerName,
      avatarLetter: playerName.trim().charAt(0).toUpperCase() || 'P',
      score: 0,
      isHost: false,
      isAlive: true
    };

    room.players.push(player);
    return { room };
  }

  removePlayer(socketId: string): { room?: RoomState; code?: string } {
    for (const [code, room] of this.rooms.entries()) {
      const index = room.players.findIndex(p => p.id === socketId);
      if (index !== -1) {
        const [removed] = room.players.splice(index, 1);

        if (room.players.length === 0) {
          this.clearTimer(code);
          this.rooms.delete(code);
          return { code };
        }

        // Nếu host rời phòng, chuyển host cho người tiếp theo
        if (removed.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }

        // Nếu người đang trong lượt rời phòng
        if (room.status === 'playing' && room.currentTurnPlayerId === socketId) {
          return { room, code };
        }

        return { room, code };
      }
    }
    return {};
  }

  startGame(code: string, onTurnTimeout: (room: RoomState) => void): { room?: RoomState; error?: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: 'Phòng không tồn tại!' };
    if (room.players.length < 2) {
      return { error: 'Cần ít nhất 2 người chơi để bắt đầu!' };
    }

    room.status = 'playing';
    room.history = [];
    room.usedPhrases = [];
    room.players.forEach(p => {
      p.isAlive = true;
      p.score = 0;
    });

    // Chọn người chơi đầu tiên ngẫu nhiên hoặc host
    room.currentTurnIndex = 0;
    room.currentTurnPlayerId = room.players[0].id;
    room.targetLetter = ''; // Lượt đầu tiên được tự do hát bất kỳ câu nào

    this.startTurnTimer(code, onTurnTimeout);
    return { room };
  }

  startTurnTimer(code: string, onTurnTimeout: (room: RoomState) => void) {
    this.clearTimer(code);
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    room.turnDeadline = Date.now() + room.turnDurationSec * 1000;

    const timer = setTimeout(() => {
      this.handleTimeout(code, onTurnTimeout);
    }, room.turnDurationSec * 1000);

    this.timers.set(code, timer);
  }

  clearTimer(code: string) {
    if (this.timers.has(code)) {
      clearTimeout(this.timers.get(code)!);
      this.timers.delete(code);
    }
  }

  handleTimeout(code: string, onTurnTimeout: (room: RoomState) => void) {
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing') return;

    const currentPlayer = room.players.find(p => p.id === room.currentTurnPlayerId);
    if (currentPlayer) {
      // Hết giờ bị trừ điểm hoặc xử thua lượt
      currentPlayer.score = Math.max(0, currentPlayer.score - 5);
    }

    // Chuyển lượt sang người tiếp theo
    this.advanceTurn(room);
    onTurnTimeout(room);
  }

  advanceTurn(room: RoomState) {
    const activePlayers = room.players.filter(p => p.isAlive);
    if (activePlayers.length <= 1) {
      room.status = 'ended';
      room.winner = activePlayers[0] || null;
      room.currentTurnPlayerId = null;
      room.turnDeadline = null;
      this.clearTimer(room.code);
      return;
    }

    // Tìm index tiếp theo trong danh sách players
    let nextIndex = (room.currentTurnIndex + 1) % room.players.length;
    while (!room.players[nextIndex].isAlive) {
      nextIndex = (nextIndex + 1) % room.players.length;
    }

    room.currentTurnIndex = nextIndex;
    room.currentTurnPlayerId = room.players[nextIndex].id;
  }

  submitTurn(
    code: string,
    socketId: string,
    text: string,
    audioBase64: string | undefined,
    onTurnTimeout: (room: RoomState) => void
  ): { room?: RoomState; error?: string; nextLetter?: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: 'Phòng không tồn tại!' };
    if (room.status !== 'playing') return { error: 'Trò chơi chưa bắt đầu hoặc đã kết thúc!' };
    if (room.currentTurnPlayerId !== socketId) return { error: 'Chưa tới lượt của bạn!' };

    const validation = validateTurn(text, room.targetLetter, room.usedPhrases);
    if (!validation.valid) {
      return { error: validation.error };
    }

    const player = room.players.find(p => p.id === socketId);
    if (!player) return { error: 'Không tìm thấy người chơi!' };

    // Cộng điểm
    player.score += 10;
    room.usedPhrases.push(text.trim());

    const nextLetter = validation.nextLetter!.toUpperCase();

    // Lưu lịch sử
    room.history.push({
      playerId: player.id,
      playerName: player.name,
      text: text.trim(),
      audioBase64,
      targetLetter: room.targetLetter,
      nextLetter,
      timestamp: Date.now()
    });

    room.targetLetter = nextLetter;

    // Chuyển lượt và đếm ngược tiếp
    this.advanceTurn(room);
    if (room.status === 'playing') {
      this.startTurnTimer(code, onTurnTimeout);
    }

    return { room, nextLetter };
  }

  resetGame(code: string): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;

    this.clearTimer(code);
    room.status = 'waiting';
    room.currentTurnIndex = 0;
    room.currentTurnPlayerId = null;
    room.targetLetter = '';
    room.turnDeadline = null;
    room.history = [];
    room.usedPhrases = [];
    room.winner = null;
    room.players.forEach(p => {
      p.isAlive = true;
      p.score = 0;
    });

    return room;
  }
}
