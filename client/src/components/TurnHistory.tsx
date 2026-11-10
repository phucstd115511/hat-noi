import React, { useRef, useState } from 'react';
import { Play, Pause, Music, Volume2 } from 'lucide-react';
import { TurnHistoryItem } from '../types';

interface TurnHistoryProps {
  history: TurnHistoryItem[];
}

export const TurnHistory: React.FC<TurnHistoryProps> = ({ history }) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = (base64Audio: string, index: number) => {
    if (playingIndex === index) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingIndex(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(base64Audio);
    audioRef.current = audio;
    setPlayingIndex(index);

    audio.play().catch(e => console.error(e));
    audio.onended = () => {
      setPlayingIndex(null);
    };
  };

  if (history.length === 0) {
    return (
      <div className="bg-[#12122b]/50 border border-indigo-950/50 rounded-3xl p-8 text-center text-slate-500 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
          <Music className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-sm font-medium">Chưa có lượt hát nào. Hãy mở màn bằng một câu hát bất kỳ!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span>Lịch sử các câu hát</span>
          <span className="bg-[#1b1b3a] text-[#00F0FF] border border-[#00F0FF]/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
            {history.length} lượt
          </span>
        </h3>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {history.slice().reverse().map((item, originalIdx) => {
          const idx = history.length - 1 - originalIdx;
          const isPlaying = playingIndex === idx;

          return (
            <div
              key={item.timestamp + idx}
              className={`rounded-2xl p-4 transition-all border backdrop-blur-md flex items-center justify-between gap-3 ${
                isPlaying
                  ? 'bg-[#181838] border-[#FF2A85]/60 shadow-[0_0_20px_rgba(255,42,133,0.25)]'
                  : 'bg-[#101026]/80 border-indigo-950/80 hover:border-indigo-800/60'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar with gradient glow */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7928CA] to-[#FF2A85] flex items-center justify-center font-black text-white text-base shrink-0 shadow-md">
                  {item.playerName.charAt(0).toUpperCase()}
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {item.playerName}
                    </span>
                    {item.targetLetter && (
                      <span className="text-[10px] font-mono font-bold bg-[#0b0b1a] text-[#00F0FF] px-2 py-0.5 rounded-md border border-[#00F0FF]/30">
                        Chữ: {item.targetLetter}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate mt-1">
                    "{item.text}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-slate-400 font-medium block">Nối tiếp chữ</span>
                  <span className="text-sm font-black text-[#FFB800] font-mono tracking-wider">
                    {item.nextLetter}
                  </span>
                </div>

                {item.audioBase64 ? (
                  <button
                    onClick={() => handlePlayAudio(item.audioBase64!, idx)}
                    className={`cursor-pointer p-3 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                      isPlaying
                        ? 'bg-[#FF2A85] text-white shadow-[0_0_15px_rgba(255,42,133,0.7)] animate-pulse'
                        : 'bg-[#1c1c3f] hover:bg-[#282859] text-[#00F0FF] border border-[#00F0FF]/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    }`}
                    title={isPlaying ? "Tạm dừng" : "Nghe câu hát"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-600 italic px-2 py-1">Không audio</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
