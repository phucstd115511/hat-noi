import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, Users, Trophy, RotateCcw, Flame, LogOut, ArrowRight, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';
import { RoomState, Player } from './types';
import { AudioRecorder } from './components/AudioRecorder';
import { TurnHistory } from './components/TurnHistory';
import { CircularCountdown } from './components/CircularCountdown';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://hat-noi.onrender.com';

export function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    setSocket(s);

    s.on('room_updated', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    });

    s.on('turn_timeout', (data: { message: string }) => {
      console.log('Timeout:', data.message);
    });

    return () => {
      s.disconnect();
    };
  }, []);

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
      setErrorMsg('Vui lòng nhập nickname của bạn trước!');
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
      setErrorMsg('Vui lòng nhập nickname của bạn trước!');
      return;
    }
    if (!roomCodeInput.trim()) {
      setErrorMsg('Vui lòng nhập mã phòng 6 chữ số!');
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
        setErrorMsg(res.error || 'Câu hát chưa đúng luật!');
      }
    });
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPlayer = room?.players.find(p => p.id === socket?.id);
  const isHost = room?.hostId === socket?.id;
  const isMyTurn = room?.status === 'playing' && room?.currentTurnPlayerId === socket?.id;
  const currentTurnPlayer = room?.players.find(p => p.id === room?.currentTurnPlayerId);

  // MÀN HÌNH CHƯA VÀO PHÒNG (CYBER MUSIC THEME)
  if (!room) {
    return (
      <div className="min-h-screen bg-[#070714] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Neon Ambient Glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#7928CA]/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#00F0FF]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-72 h-72 bg-[#FF2A85]/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-[#00F0FF] via-[#7928CA] to-[#FF2A85] text-white shadow-[0_0_35px_rgba(121,40,202,0.5)] mb-3 transform hover:rotate-6 transition-transform">
              <Mic className="w-9 h-9" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-white to-[#FF2A85] tracking-tight">
              HÁT NỐI LIVE
            </h1>
            <p className="text-xs uppercase tracking-widest text-[#00F0FF] font-semibold">
              Cyberpunk Voice Battles • Real-time
            </p>
          </div>

          <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-indigo-500/30 to-indigo-950/20 shadow-2xl">
            <div className="bg-[#0f0f26]/90 backdrop-blur-2xl rounded-[23px] p-7 space-y-5">
              {errorMsg && (
                <div className="p-3 bg-[#FF2A85]/15 border border-[#FF2A85]/40 rounded-xl text-xs font-semibold text-[#FF85C0] flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#FF2A85]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
                  Nickname của bạn
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ví dụ: Sơn Tùng, Jennie, Jack..."
                  className="w-full bg-[#080817] border border-slate-800 focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full cursor-pointer py-4 px-4 rounded-2xl bg-gradient-to-r from-[#00F0FF] via-[#7928CA] to-[#FF2A85] hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(121,40,202,0.4)] active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Flame className="w-5 h-5 text-[#FFB800]" />
                Tạo phòng đấu mới
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-800/80"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-widest font-black">
                  Hoặc nhập mã phòng
                </span>
                <div className="flex-grow border-t border-slate-800/80"></div>
              </div>

              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="MÃ 6 CHỮ CÁI"
                  className="flex-1 bg-[#080817] border border-slate-800 focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none text-center font-mono tracking-widest uppercase transition font-bold"
                />
                <button
                  onClick={handleJoinRoom}
                  className="cursor-pointer px-6 py-3.5 rounded-2xl bg-[#1c1c3f] hover:bg-[#282859] text-[#00F0FF] font-black text-sm border border-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.2)] active:scale-98 transition flex items-center gap-1.5"
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

  // MÀN HÌNH PHÒNG CHƠI CHÍNH
  return (
    <div className="min-h-screen bg-[#070714] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[300px] bg-[#7928CA]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#00F0FF]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header bar */}
      <header className="border-b border-indigo-950/80 bg-[#0d0d21]/70 backdrop-blur-xl px-5 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-[#7928CA] to-[#FF2A85] text-white shadow-[0_0_15px_rgba(255,42,133,0.4)]">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Phòng:</span>
              <button
                onClick={handleCopyCode}
                className="cursor-pointer font-mono font-black text-[#FFB800] tracking-widest bg-[#151533] hover:bg-[#1f1f48] px-2.5 py-0.5 rounded-lg border border-[#FFB800]/30 text-sm flex items-center gap-1.5 transition"
                title="Bấm để copy mã phòng"
              >
                <span>{room.code}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-[#00F0FF]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 uppercase block font-medium">Người chơi</span>
            <span className="text-sm font-black text-white">{currentPlayer?.name}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer p-2.5 rounded-2xl bg-[#141430] hover:bg-[#1e1e44] text-slate-400 hover:text-[#FF2A85] border border-indigo-950 transition active:scale-95"
            title="Rời phòng"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Cột trái: Đấu trường chính & Lịch sử */}
        <div className="lg:col-span-2 space-y-6">

          {errorMsg && (
            <div className="p-4 bg-[#FF2A85]/20 border border-[#FF2A85]/50 rounded-2xl text-sm font-bold text-[#FF85C0] flex items-center gap-3 animate-shake shadow-[0_0_20px_rgba(255,42,133,0.3)]">
              <AlertCircle className="w-5 h-5 shrink-0 text-[#FF2A85]" />
              <div className="flex-1">{errorMsg}</div>
              <button onClick={() => setErrorMsg('')} className="text-xs underline text-[#FF85C0] cursor-pointer">Đóng</button>
            </div>
          )}

          {/* VÙNG CHỜ BẮT ĐẦU */}
          {room.status === 'waiting' && (
            <div className="bg-[#101026]/80 border border-indigo-950/80 rounded-3xl p-8 text-center space-y-6 backdrop-blur-xl shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#00F0FF]/20 to-[#7928CA]/30 border border-[#00F0FF]/30 flex items-center justify-center mx-auto text-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.25)]">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white">Phòng Chờ Đấu ({room.players.length} người)</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Mời bạn bè cùng nhập mã phòng <b className="text-[#FFB800] font-mono tracking-widest text-sm">{room.code}</b> để bắt đầu đại chiến âm nhạc!
                </p>
              </div>

              {isHost ? (
                <div>
                  <button
                    onClick={handleStartGame}
                    disabled={room.players.length < 2}
                    className="cursor-pointer py-4 px-9 rounded-2xl bg-gradient-to-r from-[#00F0FF] via-[#7928CA] to-[#FF2A85] hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(121,40,202,0.5)] transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {room.players.length < 2 ? 'Cần ít nhất 2 người để bắt đầu' : 'Bắt đầu ván đấu ngay! 🚀'}
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-[#161633] text-slate-400 text-xs font-semibold border border-indigo-950 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF]"></span>
                  Đang đợi Host bắt đầu trận đấu...
                </div>
              )}
            </div>
          )}

          {/* VÙNG ĐANG CHƠI */}
          {room.status === 'playing' && (
            <>
              {/* Lượt hiện tại, Circular Countdown & Chữ cái mục tiêu */}
              <div className="bg-[#101026]/90 border border-indigo-950/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  
                  {/* Player đang hát */}
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#7928CA] to-[#FF2A85] flex items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(255,42,133,0.5)]">
                        {currentTurnPlayer?.avatarLetter || 'P'}
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00F0FF]"></span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                        Đang trong lượt của
                      </span>
                      <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <span>{currentTurnPlayer?.name}</span>
                        {isMyTurn && (
                          <span className="text-xs bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 px-2.5 py-0.5 rounded-full font-bold">
                            Chính là bạn!
                          </span>
                        )}
                      </h2>
                    </div>
                  </div>

                  {/* Vòng đếm ngược & Chữ cái */}
                  <div className="flex items-center gap-5">
                    {/* Circular Timer Visualizer */}
                    <CircularCountdown timeLeft={timeLeft} totalTime={30} />

                    {/* Chữ cái mục tiêu */}
                    <div className="bg-[#090918] border border-indigo-950 px-5 py-3 rounded-2xl text-center min-w-[95px] shadow-inner">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block">
                        CHỮ CÁI
                      </span>
                      <span className="text-3xl font-black text-[#FFB800] font-mono">
                        {room.targetLetter || 'Tự do'}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Box Ghi âm giọng hát */}
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
            <div className="bg-[#101026]/90 border border-indigo-950/80 rounded-3xl p-8 text-center space-y-6 backdrop-blur-xl shadow-2xl">
              <div className="relative inline-block">
                <Trophy className="w-16 h-16 text-[#FFB800] mx-auto animate-bounce-short filter drop-shadow-[0_0_20px_rgba(255,184,0,0.6)]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white">Ván đấu đã kết thúc!</h2>
                {room.winner ? (
                  <p className="text-lg text-[#00F0FF] font-black mt-1">
                    👑 Chúc mừng nhà vô địch: <span className="text-white underline decoration-[#FF2A85]">{room.winner.name}</span>!
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm">Trận đấu đã khép lại cực kỳ gay cấn.</p>
                )}
              </div>

              {isHost && (
                <button
                  onClick={handleRestartGame}
                  className="cursor-pointer py-3.5 px-8 rounded-2xl bg-gradient-to-r from-[#00F0FF] to-[#7928CA] hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,240,255,0.4)] transition active:scale-95 inline-flex items-center gap-2"
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

        {/* Cột phải: Bảng xếp hạng & Danh sách người chơi */}
        <div className="space-y-6">
          <div className="bg-[#101026]/80 border border-indigo-950/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-4">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00F0FF]" />
                Người chơi ({room.players.length})
              </span>
              <span className="text-[11px] text-slate-500">Điểm số</span>
            </h3>

            <div className="space-y-3">
              {room.players.map((p) => {
                const isCurrent = p.id === room.currentTurnPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-[#181838] border-[#00F0FF]/60 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                        : 'bg-[#090918]/70 border-indigo-950/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7928CA] to-[#00F0FF] flex items-center justify-center font-black text-white text-sm shadow">
                          {p.avatarLetter}
                        </div>
                        {p.isHost && (
                          <span className="absolute -top-1 -right-1 bg-[#FFB800] text-[8px] font-black px-1.5 py-0.2 rounded-full text-slate-950">
                            HOST
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.id === socket?.id && (
                            <span className="text-[10px] text-[#00F0FF] font-semibold">(Bạn)</span>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] text-[#00F0FF] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
                            Đang hát...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-[#FFB800]">
                        {p.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Rules Box */}
          <div className="bg-[#101026]/50 border border-indigo-950/50 rounded-3xl p-5 text-xs text-slate-400 space-y-2 backdrop-blur-sm">
            <h4 className="font-black text-[#00F0FF] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>Luật chơi Hát Nối</span>
            </h4>
            <p>1. Lấy <b>chữ cái đầu</b> của <b>từ cuối cùng</b> người trước hát để hát câu tiếp theo.</p>
            <p>2. Mỗi lượt có <b>30 giây</b> để bấm ghi âm và gửi câu hát.</p>
            <p>3. Không được lặp lại câu đã được hát trong cùng ván.</p>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
