import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const COLORS = ['#10b981', '#34d399', '#fbbf24', '#6366f1', '#3b82f6', '#f59e0b', '#0D7377', '#ef4444'];

export default function ConfettiCelebration({ onComplete }) {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      duration: 1.5 + Math.random() * 1,
    }))
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div className="fixed inset-0 z-[9997] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle absolute"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>,
    document.body
  );
}
