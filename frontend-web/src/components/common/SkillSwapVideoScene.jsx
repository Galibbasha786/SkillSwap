// frontend-web/src/components/common/SkillSwapVideoScene.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { FiMic, FiVideo, FiRefreshCw, FiUsers } from 'react-icons/fi';

const float = (duration, delay = 0, distance = 8) => ({
  y: [0, -distance, 0],
  transition: { duration, repeat: Infinity, ease: 'easeInOut', delay },
});

const ParticipantTile = ({ name, skill, gradient, align = 'left', speaking = false }) => (
  <div className={`relative flex-1 overflow-hidden rounded-lg ${speaking ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''}`}>
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.22),transparent_45%)]" />

    {/* Avatar */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white backdrop-blur-sm ring-2 ring-white/40">
        {name.charAt(0)}
      </div>
    </div>

    {/* Name + skill label */}
    <div className={`absolute bottom-1.5 ${align === 'left' ? 'left-1.5' : 'right-1.5'} flex flex-col gap-0.5`}>
      <span className="rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">{name}</span>
      <span className="rounded bg-white/20 px-1.5 py-0.5 text-[8px] text-white/90 backdrop-blur-sm">{skill}</span>
    </div>

    {speaking && (
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400"
      />
    )}
  </div>
);

const SkillSwapVideoScene = () => (
  <div className="relative mx-auto w-full max-w-sm px-2">
    <div className="flex flex-col items-center">
      {/* Floating skill-swap badges */}
      <motion.div
        animate={float(5, 0, 6)}
        className="absolute -left-1 top-6 z-20 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-lg"
      >
        Python ↔ UI Design
      </motion.div>

      <motion.div
        animate={float(5.5, 0.4, 5)}
        className="absolute -right-1 top-14 z-20 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-lg"
      >
        Live skill swap
      </motion.div>

      {/* Laptop with video call */}
      <motion.div animate={float(4.6, 0.2, 7)} className="relative z-10 w-[17.5rem]">
        <div className="mb-1 h-5 w-full rounded-[50%] bg-black/20 blur-lg" />

        <div className="flex flex-col items-stretch">
          {/* Screen */}
          <div className="relative h-[10.5rem] w-full rounded-t-2xl border-[9px] border-slate-950 bg-slate-950 shadow-[0_20px_50px_rgba(15,23,42,0.4)]">
            <div className="absolute -top-[4px] left-1/2 z-10 h-1 w-9 -translate-x-1/2 rounded-b bg-slate-800" />

            <div className="relative flex h-full flex-col overflow-hidden rounded-md bg-slate-900">
              {/* Call header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/90 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-red-500"
                  />
                  <span className="text-[10px] font-semibold text-white">SkillSwap Session</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5">
                  <FiUsers className="h-2.5 w-2.5 text-emerald-400" />
                  <span className="text-[9px] font-medium text-emerald-300">2 peers</span>
                </div>
              </div>

              {/* Video grid */}
              <div className="relative flex flex-1 gap-1.5 p-2">
                <ParticipantTile name="Alex" skill="Teaches Python" gradient="from-blue-600 to-indigo-700" speaking />
                <ParticipantTile name="Maya" skill="Teaches Design" gradient="from-violet-600 to-fuchsia-700" align="right" />

                {/* Swap arrow overlay */}
                <motion.div
                  animate={{ scale: [1, 1.12, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-1/2 top-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg"
                >
                  <FiRefreshCw className="h-3.5 w-3.5 text-indigo-600" />
                </motion.div>
              </div>

              {/* Call controls */}
              <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-slate-800/80 px-2 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white">
                  <FiMic className="h-3 w-3" />
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white">
                  <FiVideo className="h-3 w-3" />
                </div>
                <div className="rounded-full bg-red-500/90 px-2.5 py-0.5 text-[9px] font-semibold text-white">
                  End
                </div>
              </div>
            </div>
          </div>

          {/* Hinge + base */}
          <div className="h-1 w-full bg-gradient-to-b from-slate-700 to-slate-900" />
          <div className="relative h-4 w-full rounded-b-xl bg-gradient-to-b from-slate-300 to-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.25)]">
            <div className="absolute left-1/2 top-0.5 h-0.5 w-12 -translate-x-1/2 rounded-full bg-slate-500/60" />
          </div>
          <div className="mx-auto h-1 w-[78%] rounded-b-xl bg-slate-400" />
        </div>
      </motion.div>

      {/* Bottom tagline pills */}
      <div className="relative mt-5 flex w-full max-w-[18rem] items-center justify-between gap-3">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-lg"
        >
          <FiVideo className="h-3.5 w-3.5" />
          1-on-1 video
        </motion.div>
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-teal-700 shadow-lg"
        >
          <FiRefreshCw className="h-3.5 w-3.5" />
          Swap skills
        </motion.div>
      </div>
    </div>
  </div>
);

export default SkillSwapVideoScene;
