import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10MB cho audio base64
});

const roomManager = new RoomManager();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // 1. Tạo phòng
  socket.on('create_room', ({ playerName }: { playerName: string }, callback) => {
    try {
      const room = roomManager.createRoom(playerName || 'Player', socket.id);
      socket.join(room.code);
      callback({ success: true, room });
      io.to(room.code).emit('room_updated', room);
    } catch (err: any) {
      callback({ success: false, error: err.message });
    }
  });

  // 2. Vào phòng
  socket.on('join_room', ({ roomCode, playerName }: { roomCode: string; playerName: string }, callback) => {
    try {
      const res = roomManager.joinRoom(roomCode, playerName || 'Player', socket.id);
      if (res.error) {
        return callback({ success: false, error: res.error });
      }
      socket.join(res.room!.code);
      callback({ success: true, room: res.room });
      io.to(res.room!.code).emit('room_updated', res.room);
    } catch (err: any) {
      callback({ success: false, error: err.message });
    }
  });

  // 3. Bắt đầu trò chơi
  socket.on('start_game', ({ roomCode }: { roomCode: string }, callback) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return callback?.({ success: false, error: 'Phòng không tồn tại!' });
    if (room.hostId !== socket.id) {
      return callback?.({ success: false, error: 'Chỉ có chủ phòng mới được bắt đầu game!' });
    }

    const res = roomManager.startGame(roomCode, (updatedRoom) => {
      // Khi timeout lượt
      io.to(updatedRoom.code).emit('room_updated', updatedRoom);
      io.to(updatedRoom.code).emit('turn_timeout', {
        message: 'Hết giờ lượt hát!',
        currentTurnPlayerId: updatedRoom.currentTurnPlayerId
      });
    });

    if (res.error) {
      return callback?.({ success: false, error: res.error });
    }

    callback?.({ success: true, room: res.room });
    io.to(roomCode).emit('room_updated', res.room);
    io.to(roomCode).emit('game_started', res.room);
  });

  // 4. Gửi câu hát + audio
  socket.on('submit_turn', ({
    roomCode,
    text,
    audioBase64
  }: {
    roomCode: string;
    text: string;
    audioBase64?: string;
  }, callback) => {
    const res = roomManager.submitTurn(
      roomCode,
      socket.id,
      text,
      audioBase64,
      (updatedRoom) => {
        io.to(updatedRoom.code).emit('room_updated', updatedRoom);
        io.to(updatedRoom.code).emit('turn_timeout', {
          message: 'Hết giờ lượt hát!',
          currentTurnPlayerId: updatedRoom.currentTurnPlayerId
        });
      }
    );

    if (res.error) {
      return callback?.({ success: false, error: res.error });
    }

    callback?.({ success: true });
    // Phát cập nhật phòng và audio mới cho toàn bộ người chơi trong phòng
    io.to(roomCode).emit('room_updated', res.room);
    const lastHistoryItem = res.room!.history[res.room!.history.length - 1];
    io.to(roomCode).emit('turn_completed', lastHistoryItem);

    if (res.room!.status === 'ended') {
      io.to(roomCode).emit('game_ended', { winner: res.room!.winner });
    }
  });

  // 5. Chơi lại
  socket.on('restart_game', ({ roomCode }: { roomCode: string }, callback) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return callback?.({ success: false, error: 'Phòng không tồn tại!' });
    if (room.hostId !== socket.id) {
      return callback?.({ success: false, error: 'Chỉ chủ phòng mới có thể bắt đầu lại!' });
    }

    const resetRoom = roomManager.resetGame(roomCode);
    callback?.({ success: true, room: resetRoom });
    io.to(roomCode).emit('room_updated', resetRoom);
  });

  // 6. Xử lý ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const { room, code } = roomManager.removePlayer(socket.id);
    if (code && room) {
      io.to(code).emit('room_updated', room);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Hat Noi Server running on port ${PORT}`);
});
