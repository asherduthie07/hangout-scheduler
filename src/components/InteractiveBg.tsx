import React, { useState, useEffect } from 'react';

interface InteractiveBgProps {
  theme: 'light' | 'dark';
}

export default function InteractiveBg({ theme }: InteractiveBgProps) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Get pointer percentage coordinates
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setTargetPos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smooth lagging effect for premium feel
  useEffect(() => {
    let animationFrameId: number;
    const updatePosition = () => {
      setMousePos((current) => {
        const dx = targetPos.x - current.x;
        const dy = targetPos.y - current.y;
        return {
          x: current.x + dx * 0.08,
          y: current.y + dy * 0.08,
        };
      });
      animationFrameId = requestAnimationFrame(updatePosition);
    };
    
    animationFrameId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetPos]);

  // Premium, customized non-neon gradients based on active theme
  const gradient1 = theme === 'light'
    ? 'radial-gradient(circle, rgba(31,66,60,0.07) 0%, rgba(31,66,60,0.02) 50%, rgba(0,0,0,0) 80%)'
    : 'radial-gradient(circle, rgba(148,181,166,0.08) 0%, rgba(148,181,166,0.02) 50%, rgba(0,0,0,0) 80%)';

  const gradient2 = theme === 'light'
    ? 'radial-gradient(circle, rgba(178,126,54,0.06) 0%, rgba(178,126,54,0.01) 60%, rgba(0,0,0,0) 90%)'
    : 'radial-gradient(circle, rgba(220,172,111,0.06) 0%, rgba(220,172,111,0.01) 60%, rgba(0,0,0,0) 90%)';

  const gradient3 = theme === 'light'
    ? 'radial-gradient(circle, rgba(163,110,95,0.04) 0%, rgba(0,0,0,0) 70%)'
    : 'radial-gradient(circle, rgba(220,172,111,0.03) 0%, rgba(0,0,0,0) 70%)';

  return (
    <div id="interactive-glow-backdrop" className="fixed inset-0 -z-50 pointer-events-none overflow-hidden bg-bg-main transition-colors duration-550">
      {/* Slow Moving Ambient Muted Orbs */}
      <div 
        className="absolute rounded-full filter blur-[120px] opacity-90 transition-all duration-300 ease-out"
        style={{
          width: '60vw',
          height: '60vw',
          maxWidth: '850px',
          maxHeight: '850px',
          background: gradient1,
          left: `${mousePos.x}%`,
          top: `${mousePos.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div 
        className="absolute rounded-full filter blur-[140px] opacity-80 transition-all duration-500 ease-out"
        style={{
          width: '50vw',
          height: '50vw',
          maxWidth: '750px',
          maxHeight: '750px',
          background: gradient2,
          left: `${100 - mousePos.x}%`,
          top: `${100 - mousePos.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div 
        className="absolute rounded-full filter blur-[110px] opacity-70"
        style={{
          width: '40vw',
          height: '40vw',
          maxWidth: '550px',
          maxHeight: '550px',
          background: gradient3,
          left: `${mousePos.y}%`,
          top: `${100 - mousePos.x}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Tactile, organic paper fiber texture overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${theme === 'light' ? 'opacity-[0.035]' : 'opacity-[0.015]'} bg-repeat`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </div>
  );
}
