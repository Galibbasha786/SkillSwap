import React, { useEffect, useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SKIN = '#F4C9A8';
const SKIN_DARK = '#E5B08E';
const PANTS = '#334155';
const SHOE = '#1E293B';
const SHOE_SOLE = '#64748B';

const HumanFigure = ({
  shirtTop,
  shirtBottom,
  hairColor,
  walkPhase = 0,
  armPose = 'walk',
  compact = false,
}) => {
  const gradId = useId().replace(/:/g, '');
  const s = compact ? 0.88 : 1;

  const legL = armPose === 'walk' ? Math.sin(walkPhase) * 20 : 5;
  const legR = armPose === 'walk' ? Math.sin(walkPhase + Math.PI) * 20 : -5;

  const backArm =
    armPose === 'walk'
      ? Math.sin(walkPhase + Math.PI) * 24 - 10
      : armPose === 'shake'
        ? 18
        : 12;

  const frontArm =
    armPose === 'walk'
      ? Math.sin(walkPhase) * 24 - 14
      : armPose === 'shake'
        ? -88 + Math.sin(walkPhase * 2.2) * 5
        : -82;

  return (
    <g transform={`scale(${s})`}>
      <ellipse cx={0} cy={5} rx={21} ry={4.5} fill="rgba(15,23,42,0.12)" />

      {/* ── Legs (feet on y=0) ── */}
      <g transform="translate(-8, 0)">
        <motion.g animate={{ rotate: legL }} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ transformOrigin: '0px 0px' }}>
          <rect x={-3.5} y={0} width={7} height={24} rx={3.5} fill={PANTS} />
          <rect x={-4} y={22} width={8} height={20} rx={3.5} fill={PANTS} />
          <rect x={-6} y={38} width={12} height={6} rx={2.5} fill={SHOE} />
          <rect x={-5} y={42} width={10} height={2} rx={1} fill={SHOE_SOLE} />
        </motion.g>
      </g>
      <g transform="translate(8, 0)">
        <motion.g animate={{ rotate: legR }} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ transformOrigin: '0px 0px' }}>
          <rect x={-3.5} y={0} width={7} height={24} rx={3.5} fill={PANTS} />
          <rect x={-4} y={22} width={8} height={20} rx={3.5} fill={PANTS} />
          <rect x={-6} y={38} width={12} height={6} rx={2.5} fill={SHOE} />
          <rect x={-5} y={42} width={10} height={2} rx={1} fill={SHOE_SOLE} />
        </motion.g>
      </g>

      {/* ── Torso ── */}
      <path
        d="M-16 -2 C-18 -16 -13 -40 0 -42 C13 -40 18 -16 16 -2 L13 4 C7 8 -7 8 -13 4 Z"
        fill={`url(#${gradId})`}
      />
      <defs>
        <linearGradient id={gradId} x1="0" y1="-42" x2="0" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={shirtTop} />
          <stop offset="100%" stopColor={shirtBottom} />
        </linearGradient>
      </defs>
      <path d="M-7 -36 L0 -32 L7 -36 L0 -28 Z" fill="rgba(255,255,255,0.4)" />

      {/* ── Neck & head ── */}
      <rect x={-4.5} y={-48} width={9} height={9} rx={2.5} fill={SKIN_DARK} />
      <ellipse cx={0} cy={-64} rx={16} ry={18} fill={SKIN} />
      <path
        d="M-15 -70 C-12 -84 12 -84 15 -70 C12 -76 6 -80 0 -81 C-6 -80 -12 -76 -15 -70 Z"
        fill={hairColor}
      />
      <ellipse cx={0} cy={-76} rx={13} ry={7} fill={hairColor} />
      <ellipse cx={-15} cy={-64} rx={3} ry={4.5} fill={SKIN_DARK} />
      <ellipse cx={15} cy={-64} rx={3} ry={4.5} fill={SKIN_DARK} />
      <circle cx={-5.5} cy={-65} r={1.8} fill="#1E293B" />
      <circle cx={5.5} cy={-65} r={1.8} fill="#1E293B" />
      <path d="M-3.5 -58 Q0 -55.5 3.5 -58" stroke="#E08C8C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx={-9.5} cy={-60} rx={2.8} ry={1.8} fill="#FCA5A5" opacity={0.35} />
      <ellipse cx={9.5} cy={-60} rx={2.8} ry={1.8} fill="#FCA5A5" opacity={0.35} />

      {/* ── Back arm ── */}
      <g transform="translate(-13, -34)">
        <motion.g
          animate={{ rotate: backArm }}
          transition={{ duration: armPose === 'walk' ? 0.3 : 0.5, ease: 'easeInOut', repeat: armPose === 'shake' ? Infinity : 0, repeatType: 'mirror' }}
          style={{ transformOrigin: '0px 0px' }}
        >
          <rect x={-3} y={0} width={6.5} height={19} rx={3} fill={shirtTop} />
          <rect x={-2.5} y={17} width={5.5} height={17} rx={2.5} fill={SKIN} />
          <ellipse cx={0} cy={36} rx={4.5} ry={4} fill={SKIN} />
        </motion.g>
      </g>

      {/* ── Front arm (handshake) ── */}
      <g transform="translate(13, -34)">
        <motion.g
          animate={{ rotate: frontArm }}
          transition={{ duration: armPose === 'walk' ? 0.3 : 0.45, ease: 'easeInOut', repeat: armPose === 'shake' ? Infinity : 0, repeatType: 'mirror' }}
          style={{ transformOrigin: '0px 0px' }}
        >
          <rect x={-3.5} y={0} width={6.5} height={19} rx={3} fill={shirtTop} />
          <rect x={-3} y={17} width={5.5} height={17} rx={2.5} fill={SKIN} />
          <ellipse cx={0} cy={36} rx={5} ry={4.5} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.6} />
          <path d="M-2.5 34.5 L-2.5 38 M0 35.5 L0 39 M2.5 34.5 L2.5 38" stroke={SKIN_DARK} strokeWidth="0.9" strokeLinecap="round" />
        </motion.g>
      </g>
    </g>
  );
};

const MeetAndHandshakeScene = ({ compact = false, theme = 'light', className = '' }) => {
  const [stage, setStage] = useState('walk');
  const [cycle, setCycle] = useState(0);
  const [walkTick, setWalkTick] = useState(0);

  useEffect(() => {
    const timings = { walk: 2800, shake: 2600, fade: 1100, reset: 350 };
    const next = { walk: 'shake', shake: 'fade', fade: 'reset', reset: 'walk' };
    const timer = setTimeout(() => {
      if (stage === 'reset') setCycle((c) => c + 1);
      setStage(next[stage]);
    }, timings[stage]);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage === 'fade' || stage === 'reset') return undefined;
    const speed = stage === 'shake' ? 0.34 : 0.26;
    const id = setInterval(() => setWalkTick((t) => t + speed), 50);
    return () => clearInterval(id);
  }, [stage]);

  const isDark = theme === 'dark';
  const walking = stage === 'walk';
  const shaking = stage === 'shake';
  const hidden = stage === 'fade' || stage === 'reset';

  const W = compact ? 320 : 400;
  const H = compact ? 172 : 204;
  const groundY = H - 16;
  const meetX = W / 2;
  const handY = groundY - 62;
  const leftMeetX = meetX - 36;
  const rightMeetX = meetX + 36;
  const leftStartX = compact ? 40 : 46;
  const rightStartX = compact ? W - 40 : W - 46;

  const labelClass = isDark ? 'text-white/90 bg-white/15' : 'text-indigo-800 bg-white/90';
  const armPose = shaking ? 'shake' : 'walk';

  return (
    <div className={`relative mx-auto w-full select-none ${compact ? 'max-w-[20rem]' : 'max-w-md'} ${className}`}>
      <div
        className={`relative overflow-hidden rounded-2xl border ${
          isDark ? 'border-white/15 bg-white/5' : 'border-indigo-100/80 bg-gradient-to-b from-slate-50/95 to-indigo-50/80'
        } backdrop-blur-sm shadow-xl ${compact ? 'h-[10.75rem]' : 'h-[12.75rem]'}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDark
              ? 'bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.09),transparent_58%)]'
              : 'bg-[radial-gradient(circle_at_50%_22%,rgba(199,210,254,0.4),transparent_58%)]'
          }`}
        />

        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          <line
            x1={20}
            y1={groundY}
            x2={W - 20}
            y2={groundY}
            stroke={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(99,102,241,0.28)'}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <ellipse cx={meetX} cy={groundY + 4} rx={compact ? 72 : 90} ry={7} fill={isDark ? 'rgba(0,0,0,0.18)' : 'rgba(99,102,241,0.1)'} />

          <AnimatePresence>
            {shaking && (
              <motion.g
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.06, 1] }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.65, repeat: Infinity, ease: 'easeInOut' }}
              >
                <circle cx={meetX} cy={handY} r={11} fill={isDark ? 'rgba(250,204,21,0.18)' : 'rgba(251,191,36,0.22)'} />
                <ellipse cx={meetX} cy={handY} rx={7} ry={5.5} fill={SKIN} stroke={SKIN_DARK} strokeWidth={0.8} />
                {[0, 60, 120, 180, 240, 300].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  return (
                    <line
                      key={deg}
                      x1={meetX + Math.cos(rad) * 9}
                      y1={handY + Math.sin(rad) * 9}
                      x2={meetX + Math.cos(rad) * 17}
                      y2={handY + Math.sin(rad) * 17}
                      stroke={isDark ? '#FDE68A' : '#F59E0B'}
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      opacity={0.75}
                    />
                  );
                })}
              </motion.g>
            )}
          </AnimatePresence>

          {/* Left boy — faces right */}
          <motion.g
            key={`left-${cycle}`}
            initial={{ x: leftStartX, opacity: 0 }}
            animate={{
              x: walking ? [leftStartX, leftMeetX] : stage === 'reset' ? leftStartX : leftMeetX,
              opacity: hidden ? 0 : 1,
            }}
            transition={{
              x: { duration: walking ? 2.55 : 0, ease: [0.22, 0.85, 0.28, 1] },
              opacity: { duration: stage === 'fade' ? 0.95 : 0.35 },
            }}
          >
            <g transform={`translate(0, ${groundY})`}>
              <HumanFigure
                shirtTop="#3B82F6"
                shirtBottom="#3730A3"
                hairColor="#2D3748"
                walkPhase={walkTick}
                armPose={armPose}
                compact={compact}
              />
            </g>
          </motion.g>

          {/* Right boy — mirrored to face left */}
          <motion.g
            key={`right-${cycle}`}
            initial={{ x: rightStartX, opacity: 0 }}
            animate={{
              x: walking ? [rightStartX, rightMeetX] : stage === 'reset' ? rightStartX : rightMeetX,
              opacity: hidden ? 0 : 1,
            }}
            transition={{
              x: { duration: walking ? 2.55 : 0, ease: [0.22, 0.85, 0.28, 1] },
              opacity: { duration: stage === 'fade' ? 0.95 : 0.35 },
            }}
          >
            <g transform={`translate(0, ${groundY}) scale(-1, 1)`}>
              <HumanFigure
                shirtTop="#10B981"
                shirtBottom="#0D9488"
                hairColor="#1A202C"
                walkPhase={walkTick + 0.6}
                armPose={armPose}
                compact={compact}
              />
            </g>
          </motion.g>
        </svg>

        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: hidden ? 0 : 1, y: 0 }}
          className={`absolute left-1/2 top-2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-sm sm:text-xs ${labelClass}`}
        >
          {stage === 'walk' && 'Two learners approaching…'}
          {stage === 'shake' && 'Handshake — skills connected!'}
          {(stage === 'fade' || stage === 'reset') && 'See you at the next swap'}
        </motion.div>
      </div>

      {!compact && (
        <p className={`mt-3 text-center text-sm ${isDark ? 'text-white/75' : 'text-gray-600'}`}>
          Meet peers, swap skills, grow together
        </p>
      )}
    </div>
  );
};

export default MeetAndHandshakeScene;
