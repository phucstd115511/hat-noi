import React from 'react';

interface CircularCountdownProps {
  timeLeft: number;
  totalTime?: number;
}

export const CircularCountdown: React.FC<CircularCountdownProps> = ({
  timeLeft,
  totalTime = 30
}) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, timeLeft / totalTime));
  const strokeDashoffset = circumference - progress * circumference;

  const isUrgent = timeLeft <= 5;
  const isWarning = timeLeft <= 10 && !isUrgent;

  const strokeColor = isUrgent
    ? '#FF2A85' // Hot Pink / Neon Rose
    : isWarning
    ? '#FFB800' // Neon Amber
    : '#00F0FF'; // Cyber Cyan

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        {/* Background track */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="stroke-slate-800/80"
          strokeWidth="6"
          fill="transparent"
        />
        {/* Animated Progress Ring */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease',
            filter: isUrgent ? 'drop-shadow(0 0 8px rgba(255, 42, 133, 0.8))' : 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))'
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`text-2xl font-black font-mono transition-transform ${
            isUrgent ? 'text-[#FF2A85] scale-110 animate-pulse' : isWarning ? 'text-[#FFB800]' : 'text-[#00F0FF]'
          }`}
        >
          {timeLeft}s
        </span>
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
          còn lại
        </span>
      </div>
    </div>
  );
};
