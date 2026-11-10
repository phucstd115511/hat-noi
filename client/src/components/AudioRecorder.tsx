import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

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
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 40, 20, 30, 60, 45, 20, 35, 15, 25, 40]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isCurrentTurn) {
      cleanupRecording();
      setRecordDuration(0);
      setAudioBase64(undefined);
      setTextInput('');
      setErrorMsg('');
    }
  }, [isCurrentTurn]);

  const cleanupRecording = () => {
    setIsRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const samples: number[] = [];
        const step = Math.floor(bufferLength / 12) || 1;
        for (let i = 0; i < 12; i++) {
          const val = dataArray[i * step] || 10;
          samples.push(Math.max(15, Math.min(95, Math.round((val / 255) * 100))));
        }
        setAudioLevels(samples);
        animFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => {
          if (prev >= 15) {
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
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) {
      setErrorMsg('Vui lòng nhập câu hát bạn vừa hát để hệ thống chấm luật!');
      return;
    }
    onSendTurn(textInput.trim(), audioBase64);
  };

  if (!isCurrentTurn) {
    return (
      <div className="bg-[#12122b]/80 border border-indigo-950/80 rounded-3xl p-6 text-center text-slate-400 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>
          <p className="text-sm font-medium">Đang đợi tới lượt của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-r from-[#00F0FF] via-[#7928CA] to-[#FF2A85] shadow-[0_0_35px_rgba(121,40,202,0.35)] transition-all">
      <div className="bg-[#101026]/95 backdrop-blur-xl rounded-[23px] p-6 space-y-5">
        
        {/* Header box lượt của bạn */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-[#00F0FF]">
                Đang là lượt của bạn!
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              {targetLetter ? (
                <>
                  Hát từ/câu bắt đầu bằng chữ:{' '}
                  <span className="text-[#FFB800] text-3xl font-black font-mono underline decoration-[#FF2A85] decoration-wavy underline-offset-4 ml-1">
                    {targetLetter}
                  </span>
                </>
              ) : (
                <span className="text-[#00F0FF] flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-[#FFB800]" />
                  Lượt mở màn: Tự do hát bất kỳ câu nào!
                </span>
              )}
            </h3>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2A85]/20 border border-[#FF2A85]/40 text-[#FF2A85] text-xs font-bold animate-pulse self-start sm:self-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF2A85]" />
              ĐANG THU: {recordDuration}s / 15s
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-[#FF2A85]/15 border border-[#FF2A85]/40 rounded-2xl text-xs font-semibold text-[#FF85C0] flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FF2A85]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real-time Audio Visualizer khi đang thu âm */}
        {isRecording && (
          <div className="bg-[#0b0b1a] border border-[#00F0FF]/30 rounded-2xl p-4 flex items-center justify-center gap-1.5 h-20 shadow-inner">
            {audioLevels.map((lvl, idx) => (
              <div
                key={idx}
                className="w-2 rounded-full transition-all duration-75"
                style={{
                  height: `${lvl}%`,
                  background: `linear-gradient(to top, #00F0FF, #7928CA, #FF2A85)`
                }}
              />
            ))}
          </div>
        )}

        {/* Action Controls: Bấm Ghi âm & Nghe lại */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          {!isRecording ? (
            <button
              type="button"
              disabled={disabled}
              onClick={startRecording}
              className="w-full sm:w-auto flex-1 cursor-pointer flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF2A85] to-[#7928CA] hover:from-[#ff4095] hover:to-[#8d3ee6] text-white font-bold text-sm shadow-[0_0_20px_rgba(255,42,133,0.4)] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mic className="w-5 h-5 animate-bounce-short" />
              <span>Bấm để Ghi âm giọng hát (Tối đa 15s)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full sm:w-auto flex-1 cursor-pointer flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-[#FF2A85] hover:bg-[#ff1a7d] text-white font-bold text-sm shadow-[0_0_25px_rgba(255,42,133,0.6)] active:scale-95 transition-all"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Dừng ghi âm ({recordDuration}s)</span>
            </button>
          )}

          {audioBase64 && !isRecording && (
            <div className="flex items-center gap-2.5 bg-[#00F0FF]/10 border border-[#00F0FF]/30 px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#00F0FF]">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00F0FF]" />
              <span className="hidden sm:inline">Đã thu âm:</span>
              <audio controls src={audioBase64} className="h-7 w-40" />
            </div>
          )}
        </div>

        {/* Input Text Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5 pt-2">
          <label className="block text-xs font-semibold text-slate-300">
            Nhập lời câu hát bạn vừa hát: <span className="text-slate-400 font-normal">(để hệ thống chấm theo luật)</span>
          </label>
          <div className="flex gap-2.5">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={targetLetter ? `Ví dụ: Bắt đầu bằng chữ '${targetLetter}'...` : "Ví dụ: Mùa xuân trên thành phố Hồ Chí Minh..."}
              className="flex-1 bg-[#090918] border border-slate-800 focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
              autoFocus
            />
            <button
              type="submit"
              disabled={disabled || !textInput.trim()}
              className="cursor-pointer px-6 py-3 rounded-2xl bg-[#00F0FF] hover:bg-[#38f3ff] text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gửi câu hát
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
