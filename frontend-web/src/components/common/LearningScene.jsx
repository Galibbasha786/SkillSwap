// frontend-web/src/components/common/LearningScene.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { FiBook, FiBookOpen, FiCode, FiPenTool, FiTrendingUp, FiUsers, FiVideo } from 'react-icons/fi';

const float = (duration, delay = 0, distance = 10) => ({
  y: [0, -distance, 0],
  transition: { duration, repeat: Infinity, ease: 'easeInOut', delay },
});

const OpenBook = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: { page: 'h-24 w-[5.25rem]', spine: 'h-24 w-1.5', p: 'p-2.5', icon: 'h-3.5 w-3.5' },
    md: { page: 'h-32 w-36', spine: 'h-32 w-2.5', p: 'p-4', icon: 'h-5 w-5' },
    lg: { page: 'h-36 w-[9.25rem]', spine: 'h-36 w-3', p: 'p-4', icon: 'h-5 w-5' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div
      className={`relative inline-flex items-stretch justify-center ${className}`}
      style={{ perspective: '900px' }}
    >
      <div className="pointer-events-none absolute inset-x-[6%] -bottom-2.5 h-4 rounded-[50%] bg-slate-900/20 blur-md" />

      <motion.div
        animate={{ rotateY: [0, -12, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        className={`${s.page} shrink-0 origin-right`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className={`relative h-full w-full rounded-l-2xl rounded-r-[3px] border border-r-0 border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-amber-100 ${s.p} shadow-[-6px_10px_22px_rgba(15,23,42,0.14)]`}
        >
          <div className="mb-3 flex items-center gap-2">
            <FiBookOpen className={`${s.icon} text-amber-700`} />
            <div className="h-2 w-16 rounded-full bg-amber-300" />
          </div>
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-slate-200" />
            <div className="h-2 w-5/6 rounded-full bg-slate-200" />
            <div className="h-2 w-2/3 rounded-full bg-slate-200" />
            <div className="h-2 w-4/5 rounded-full bg-slate-200" />
          </div>
          <div className="absolute bottom-3 left-4 h-3.5 w-16 rounded-full bg-amber-100/90" />
        </div>
      </motion.div>

      <div
        className={`${s.spine} shrink-0 rounded-sm bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 shadow-[inset_-2px_0_6px_rgba(0,0,0,0.25)]`}
      />

      <motion.div
        animate={{ rotateY: [0, 12, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        className={`${s.page} shrink-0 origin-left`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className={`h-full w-full rounded-r-2xl rounded-l-[3px] border border-l-0 border-violet-200/90 bg-gradient-to-bl from-violet-50 via-white to-emerald-50 ${s.p} shadow-[6px_10px_22px_rgba(15,23,42,0.14)]`}
        >
          <div className="mb-4 flex justify-end">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 ring-4 ring-white shadow-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 rounded-lg bg-blue-100" />
            <div className="h-8 rounded-lg bg-amber-100" />
            <div className="h-8 rounded-lg bg-rose-100" />
            <div className="h-8 rounded-lg bg-emerald-100" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Laptop = ({ widthClass, screenHeightClass, isCompact = false }) => (
  <div className={`flex flex-col items-stretch ${widthClass}`}>
    <div
      className={`relative w-full ${screenHeightClass} shrink-0 rounded-t-[1.35rem] border-[10px] border-slate-950 bg-slate-950 shadow-[0_22px_55px_rgba(15,23,42,0.38)]`}
    >
      <div className="absolute -top-[5px] left-1/2 z-10 h-1.5 w-11 -translate-x-1/2 rounded-b-md bg-slate-800 ring-1 ring-slate-700" />

      <div className="relative h-full overflow-hidden rounded-[0.55rem] bg-gradient-to-br from-sky-50 via-white to-violet-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(59,130,246,0.14),transparent_35%),radial-gradient(circle_at_85%_22%,rgba(168,85,247,0.12),transparent_32%)]" />

        <div className="flex items-center justify-between border-b border-white/90 bg-white/92 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400 shadow-inner" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-inner" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-inner" />
          </div>
          <div className="h-2 w-[4.5rem] rounded-full bg-slate-200" />
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 ring-2 ring-white" />
        </div>

        <div className={`grid ${isCompact ? 'grid-cols-1 p-3' : 'grid-cols-[1.08fr_0.88fr] gap-3 p-4'}`}>
          <div>
            <div className={`mb-3 ${isCompact ? 'h-6 w-28' : 'h-8 w-32'} rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 shadow-md shadow-blue-500/20`} />
            <div className="rounded-xl border border-white bg-white/82 p-2.5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400" />
                <div className="space-y-1">
                  <div className="h-2 w-16 rounded-full bg-slate-300" />
                  <div className="h-1.5 w-10 rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-slate-200" />
                <div className="h-2 w-5/6 rounded-full bg-slate-200" />
                <div className="h-2 w-3/5 rounded-full bg-slate-200" />
              </div>
            </div>
            {!isCompact && (
              <div className="mt-3 flex gap-2">
                <div className="h-8 w-20 rounded-lg bg-slate-950 shadow-md" />
                <div className="h-8 w-20 rounded-lg border border-slate-200 bg-white shadow-sm" />
              </div>
            )}
          </div>

          {!isCompact && (
            <div className="rounded-xl border border-white bg-white/92 p-3 shadow-md shadow-violet-500/10">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="h-2.5 w-16 rounded-full bg-slate-300" />
                  <div className="mt-1.5 h-2 w-10 rounded-full bg-slate-200" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <FiTrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {['bg-blue-100', 'bg-amber-100', 'bg-rose-100', 'bg-emerald-100'].map((bg, i) => (
                  <div key={i} className={`h-10 rounded-lg ${bg} p-1.5`}>
                    <div className="h-1.5 w-8 rounded-full bg-white/60" />
                    <div className="mt-1 h-4 rounded-md bg-white/50" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-[0.55rem] bg-gradient-to-br from-white/28 via-transparent to-transparent" />
      </div>
    </div>

    <div className="h-[5px] w-full shrink-0 bg-gradient-to-b from-slate-600 via-slate-800 to-slate-950" />

    <div className="relative h-[1.4rem] w-full shrink-0 rounded-b-[1.1rem] bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 shadow-[0_14px_32px_rgba(15,23,42,0.28)]">
      <div className="absolute left-1/2 top-[3px] h-[3px] w-[4.5rem] -translate-x-1/2 rounded-full bg-slate-500/55" />
    </div>

    <div className="mx-auto mt-px h-[4px] w-[78%] shrink-0 rounded-b-2xl bg-gradient-to-b from-slate-400 to-slate-500" />
  </div>
);

const ClosedBook = ({ className = '' }) => (
  <div className={`relative ${className}`}>
    <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-[85%] -translate-x-1/2 rounded-[50%] bg-slate-900/12 blur-sm" />
    <div className="flex w-24 overflow-hidden rounded-lg shadow-xl ring-1 ring-amber-200/80">
      <div className="w-1/2 rounded-l-lg border border-r-0 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <FiBook className="h-3.5 w-3.5 text-amber-700" />
          <div className="h-1.5 w-8 rounded-full bg-amber-300" />
        </div>
        <div className="space-y-1">
          <div className="h-1 rounded-full bg-slate-200" />
          <div className="h-1 w-4/5 rounded-full bg-slate-200" />
          <div className="h-1 w-3/5 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="w-1 shrink-0 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800" />
      <div className="w-1/2 rounded-r-lg border border-l-0 border-amber-200 bg-gradient-to-bl from-white via-amber-50 to-amber-100 p-2.5">
        <div className="mb-2 flex justify-end">
          <div className="h-1.5 w-6 rounded-full bg-violet-300" />
        </div>
        <div className="space-y-1">
          <div className="h-1 rounded-full bg-slate-200" />
          <div className="h-1 w-5/6 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  </div>
);

const LearningScene = ({ compact = false, variant = 'full' }) => {
  const isLogin = variant === 'login';
  const sceneHeight = compact ? 'h-[26rem]' : 'h-[34rem]';
  const sceneWidth = compact ? 'max-w-lg' : 'max-w-2xl';
  const laptopWidth = compact ? 'w-[19rem]' : 'w-[22rem]';
  const laptopScreenH = compact ? 'h-44' : 'h-52';

  if (isLogin) {
    return (
      <div className="relative mx-auto w-full max-w-sm px-2">
        <div className="flex flex-col items-center">
          <motion.div animate={float(4.8, 0.1, 8)} className="relative z-10">
            <OpenBook size="lg" />
          </motion.div>

          <div className="relative mt-6 flex w-full max-w-[19rem] items-center justify-between gap-4">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-blue-700 shadow-lg"
            >
              <FiUsers className="h-4 w-4 shrink-0" />
              Peer learning
            </motion.div>

            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-amber-700 shadow-lg"
            >
              <FiTrendingUp className="h-4 w-4 shrink-0" />
              Skill growth
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mx-auto ${sceneWidth} w-full ${sceneHeight} overflow-visible`}>
      <motion.div animate={float(5.5, 0.2, 12)} className={`absolute ${compact ? 'left-5 top-5' : 'left-8 top-8'} z-20`}>
        <ClosedBook />
      </motion.div>

      <motion.div
        animate={float(5, 0.8, 10)}
        className={`absolute ${compact ? 'right-4 top-10' : 'right-6 top-14'} z-20 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-lg ring-1 ring-emerald-100`}
      >
        <FiVideo className="h-4 w-4" />
        Live session
      </motion.div>

      {/* Laptop — bottom-centered with aligned shadow */}
      <div className={`absolute inset-x-0 ${compact ? 'bottom-6' : 'bottom-8'} z-10 flex flex-col items-center`}>
        <div className={`${laptopWidth} mb-1 h-6 rounded-[50%] bg-slate-900/16 blur-xl`} />
        <motion.div animate={float(4.8, 0, 8)} className={laptopWidth}>
          <Laptop widthClass="w-full" screenHeightClass={laptopScreenH} isCompact={compact} />
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, -6, 0], rotateZ: [-6, -3, -6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute ${compact ? 'bottom-[5.5rem] left-2' : 'bottom-[6.5rem] left-6'} z-0 hidden sm:block`}
      >
        <OpenBook size="sm" />
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute ${compact ? 'bottom-[7rem] left-0' : 'bottom-[7.5rem] left-0'} z-20 flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-lg ring-1 ring-slate-100`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <FiCode className="h-4 w-4" />
        </div>
        <div>
          <div className="h-2 w-16 rounded-full bg-slate-300" />
          <div className="mt-1.5 h-1.5 w-10 rounded-full bg-slate-200" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0], x: [0, -4, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute ${compact ? 'bottom-[7rem] right-0' : 'bottom-[7.5rem] right-0'} z-20 flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-lg ring-1 ring-slate-100`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <FiPenTool className="h-4 w-4" />
        </div>
        <div>
          <div className="h-2 w-20 rounded-full bg-slate-300" />
          <div className="mt-1.5 h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
      </motion.div>
    </div>
  );
};

export default LearningScene;
