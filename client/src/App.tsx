import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, Users, Trophy, RotateCcw, Volume2, Flame, LogOut, ArrowRight, Music, AlertCircle } from 'lucide-react';
import { RoomState, Player } from './types';
import { AudioRecorder } from './components/AudioRecorder';
import { TurnHistory } from './components/TurnHistory';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://hat-noi.onrender.com';

export function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(30);

  // Kết nối socket
  useEffect(() => {
    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    setSocket(s);

    s.on('room_updated', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    });

    s.on('turn_timeout', (data: { message: string }) => {
      // Có thể phát âm thanh buzz hoặc thông báo
      console.log('Timeout:', data.message);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Timer đếm ngược theo turnDeadline của server
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.turnDeadline) {
      setTimeLeft(30);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = room.turnDeadline! - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(sec);
    }, 200);

    return () => clearInterval(interval);
  }, [room?.turnDeadline, room?.status]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setErrorMsg('Vui lòng nhập tên của bạn trước!');
      return;
    }
    setErrorMsg('');
    socket?.emit('create_room', { playerName: playerName.trim() }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
      } else {
        setErrorMsg(res.error || 'Lỗi khi tạo phòng');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setErrorMsg('Vui lòng nhập tên của bạn trước!');
      return;
    }
    if (!roomCodeInput.trim()) {
      setErrorMsg('Vui lòng nhập mã phòng (6 ký tự)!');
      return;
    }
    setErrorMsg('');
    socket?.emit('join_room', {
      roomCode: roomCodeInput.trim().toUpperCase(),
      playerName: playerName.trim()
    }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
      } else {
        setErrorMsg(res.error || 'Không thể tham gia phòng');
      }
    });
  };

  const handleStartGame = () => {
    if (!room) return;
    socket?.emit('start_game', { roomCode: room.code }, (res: any) => {
      if (!res.success) {
        setErrorMsg(res.error || 'Không thể bắt đầu trò chơi');
      }
    });
  };

  const handleRestartGame = () => {
    if (!room) return;
    socket?.emit('restart_game', { roomCode: room.code });
  };

  const handleSendTurn = (text: string, audioBase64?: string) => {
    if (!room) return;
    setErrorMsg('');
    socket?.emit('submit_turn', {
      roomCode: room.code,
      text,
      audioBase64
    }, (res: any) => {
      if (!res.success) {
        setErrorMsg(res.error || 'Câu hát không hợp lệ!');
      }
    });
  };

  const currentPlayer = room?.players.find(p => p.id === socket?.id);
  const isHost = room?.hostId === socket?.id;
  const isMyTurn = room?.status === 'playing' && room?.currentTurnPlayerId === socket?.id;
  const currentTurnPlayer = room?.players.find(p => p.id === room?.currentTurnPlayerId);

  // MÀN HÌNH CHƯA VÀO PHÒNG
  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-rose-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white shadow-xl shadow-indigo-500/25 mb-4">
              <Mic className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Hát Nối Real-time</h1>
            <p className="text-sm text-slate-400 mt-2">
              Đấu trường âm nhạc nối chữ tiếng Việt cực cuốn cùng bạn bè!
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tên hiển thị của bạn
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Nhập nickname của bạn..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4 text-amber-300" />
                  Tạo phòng chơi mới
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Hoặc vào phòng</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="MÃ PHÒNG (6 KÝ TỰ)"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none text-center font-mono tracking-widest uppercase transition"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 active:scale-98 transition flex items-center gap-1.5"
                >
                  <span>Vào</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MÀN HÌNH PHÒNG CHƠI
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-4 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Mã phòng:</span>
              <span className="font-mono font-black text-amber-400 tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-sm">
                {room.code}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block">Bạn là</span>
            <span className="text-sm font-bold text-white">{currentPlayer?.name}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
            title="Rời phòng"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột trái & giữa: Bảng đấu chính & Lịch sử */}
        <div className="lg:col-span-2 space-y-6">

          {/* Error notification banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-sm text-rose-300 flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <div className="flex-1">{errorMsg}</div>
              <button onClick={() => setErrorMsg('')} className="text-xs underline text-rose-400">Đóng</button>
            </div>
          )}

          {/* VÙNG TRẠNG THÁI CHỜ BẮT ĐẦU */}
          {room.status === 'waiting' && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Phòng chờ ({room.players.length} người)</h2>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  Hãy gửi mã phòng <b className="text-amber-400 font-mono tracking-widest">{room.code}</b> cho bạn bè cùng vào chơi!
                </p>
              </div>

              {isHost ? (
                <div>
                  <button
                    onClick={handleStartGame}
                    disabled={room.players.length < 2}
                    className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {room.players.length < 2 ? 'Cần ít nhất 2 người để bắt đầu' : 'Bắt đầu ván đấu! 🚀'}
                  </button>
                </div>
              ) : (
                <div className="inline-block py-2 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs animate-pulse">
                  Đang đợi chủ phòng bấm Bắt đầu...
                </div>
              )}
            </div>
          )}

          {/* VÙNG ĐANG CHƠI */}
          {room.status === 'playing' && (
            <>
              {/* Lượt hiện tại & Đếm ngược 30s */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                      {currentTurnPlayer?.avatarLetter || 'P'}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        Đang đến lượt của
                      </span>
                      <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <span>{currentTurnPlayer?.name}</span>
                        {isMyTurn && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                            Là bạn!
                          </span>
                        )}
                      </h2>
                    </div>
                  </div>

                  {/* Vòng đếm ngược thời gian */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-mono font-black ${timeLeft <= 5 ? 'text-rose-500 animate-ping' : timeLeft <= 10 ? 'text-amber-400' : 'text-indigo-400'}`}>
                        {timeLeft}s
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Thời gian</span>
                    </div>

                    {/* Chữ cái bắt buộc */}
                    <div className="bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-2xl text-center min-w-[90px]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Chữ cái</span>
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        {room.targetLetter || 'Tự do'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box Ghi âm & Nhập câu hát */}
              <AudioRecorder
                isCurrentTurn={isMyTurn}
                targetLetter={room.targetLetter}
                onSendTurn={handleSendTurn}
                disabled={timeLeft <= 0}
              />
            </>
          )}

          {/* VÙNG KẾT THÚC GAME */}
          {room.status === 'ended' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
              <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce-short" />
              <div>
                <h2 className="text-3xl font-black text-white">Ván đấu kết thúc!</h2>
                {room.winner ? (
                  <p className="text-lg text-emerald-400 font-semibold mt-1">
                    🎉 Chúc mừng người chiến thắng: <b className="text-white">{room.winner.name}</b>!
                  </p>
                ) : (
                  <p className="text-slate-400 mt-1">Trận đấu đã khép lại.</p>
                )}
              </div>

              {isHost && (
                <button
                  onClick={handleRestartGame}
                  className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/50 transition active:scale-95 inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Chơi lại ván mới
                </button>
              )}
            </div>
          )}

          {/* Lịch sử câu hát */}
          <TurnHistory history={room.history} />
        </div>

        {/* Cột phải: Bảng điểm & Danh sách người chơi */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-4">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Người chơi ({room.players.length})
              </span>
              <span className="text-xs text-slate-500">Điểm</span>
            </h3>

            <div className="space-y-3">
              {room.players.map((p, idx) => {
                const isCurrent = p.id === room.currentTurnPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isCurrent
                        ? 'bg-indigo-600/10 border-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-white text-sm">
                          {p.avatarLetter}
                        </div>
                        {p.isHost && (
                          <span className="absolute -top-1 -right-1 bg-amber-500 text-[9px] font-black px-1 rounded-full text-slate-950">
                            HOST
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.id === socket?.id && (
                            <span className="text-[10px] text-slate-400 font-normal">(Bạn)</span>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="text-[11px] text-indigo-400 font-medium">Đang hát...</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black font-mono text-amber-400">
                        {p.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Luật chơi tóm tắt */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-3xl p-5 text-xs text-slate-400 space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Luật chơi</h4>
            <p>1. Lấy <b>chữ cái đầu</b> của <b>từ cuối cùng</b> người trước hát để hát câu tiếp.</p>
            <p>2. Mỗi người có <b>30 giây</b> để bấm ghi âm và gửi câu hát.</p>
            <p>3. Không được lặp lại câu đã có người dùng trong ván.</p>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
