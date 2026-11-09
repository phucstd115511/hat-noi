import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { TurnHistoryItem } from './types';

interface AudioRecorderProps {
  isCurrentTurn: boolean;
  targetLetter: string;
  onSendTurn: (text: string, audioBase64?: string) => void;
  disabled: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  isCurrentTurn,
  targetLetter,
  onSendTurn,
  disabled
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | undefined>(undefined);
  const [textInput, setTextInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset state khi đổi lượt
    if (!isCurrentTurn) {
      setIsRecording(false);
      setRecordDuration(0);
      setAudioBase64(undefined);
      setTextInput('');
      setErrorMsg('');
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [isCurrentTurn]);

  const startRecording = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        // Tắt microphone tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => {
          if (prev >= 15) { // Tối đa 15 giây
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể truy cập Microphone! Hãy cấp quyền micro trên trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) {
      setErrorMsg('Vui lòng nhập câu hát bạn vừa hát!');
      return;
    }
    onSendTurn(textInput.trim(), audioBase64);
  };

  if (!isCurrentTurn) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <p className="text-sm">Đang đợi tới lượt của bạn...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border-2 border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Target letter reminder */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Lượt của bạn</span>
          <h3 className="text-lg font-bold text-white">
            {targetLetter ? (
              <>Hát từ/câu bắt đầu bằng chữ: <span className="text-amber-400 text-2xl font-black underline ml-1">{targetLetter}</span></>
            ) : (
              <span className="text-emerald-400">Lượt đầu tiên: Hát câu/từ bất kỳ!</span>
            )}
          </h3>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Đang ghi: {recordDuration}s / 15s
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Recording Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-5">
        {!isRecording ? (
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-semibold shadow-lg shadow-rose-950/50 transition-all active:scale-95 disabled:opacity-50"
          >
            <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
            Bấm để Ghi âm giọng hát (Max 15s)
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/50 font-semibold transition-all active:scale-95"
          >
            <Square className="w-4 h-4 fill-rose-500" />
            Dừng ghi âm ({recordDuration}s)
          </button>
        )}

        {audioBase64 && (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl text-emerald-400 text-xs">
            <Volume2 className="w-4 h-4" />
            <span>Đã thu âm xong</span>
            <audio controls src={audioBase64} className="h-7 w-36 ml-2" />
          </div>
        )}
      </div>

      {/* Form submit text */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-xs font-medium text-slate-300">
          Nhập lời câu hát bạn vừa hát: <span className="text-slate-400 font-normal">(để hệ thống chấm luật)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={targetLetter ? `Ví dụ: Bắt đầu bằng chữ '${targetLetter}'...` : "Ví dụ: Mùa xuân trên quê hương..."}
            className="flex-1 bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
            autoFocus
          />
          <button
            type="submit"
            disabled={disabled || !textInput.trim()}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-950/50 transition-all active:scale-95 disabled:opacity-50"
          >
            Gửi câu hát
          </button>
        </div>
      </form>
    </div>
  );
};
