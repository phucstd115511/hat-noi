import React, { useRef, useState } from 'react';
import { Play, Pause, Music, User } from 'lucide-react';
import { TurnHistoryItem } from './types';

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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500">
        <Music className="w-10 h-10 mx-auto mb-2 text-slate-600 animate-pulse" />
        <p className="text-sm">Chưa có lượt hát nào. Hãy bắt đầu ván đấu bằng câu hát đầu tiên!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <span>Lịch sử các câu hát</span>
        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">
          {history.length}
        </span>
      </h3>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {history.slice().reverse().map((item, originalIdx) => {
          const idx = history.length - 1 - originalIdx;
          const isPlaying = playingIndex === idx;

          return (
            <div
              key={item.timestamp + idx}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 transition flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow">
                  {item.playerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300 truncate">
                      {item.playerName}
                    </span>
                    {item.targetLetter && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                        Chữ: {item.targetLetter}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white truncate mt-0.5">
                    "{item.text}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-slate-500 block">Nối tiếp</span>
                  <span className="text-xs font-black text-amber-400 font-mono">
                    Chữ {item.nextLetter}
                  </span>
                </div>

                {item.audioBase64 && (
                  <button
                    onClick={() => handlePlayAudio(item.audioBase64!, idx)}
                    className={`p-2.5 rounded-xl transition ${
                      isPlaying
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50'
                    }`}
                    title={isPlaying ? "Tạm dừng" : "Nghe câu hát"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
