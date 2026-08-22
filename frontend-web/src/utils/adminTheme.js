export const ADMIN_ACCENTS = {
  aurora: {
    label: 'Aurora',
    gradient: 'from-blue-600 to-purple-600',
    btn: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
    ring: 'ring-purple-300/50',
    tabActive: 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400',
    stat: { blue: 'bg-blue-500/15 text-blue-500', green: 'bg-emerald-500/15 text-emerald-500', purple: 'bg-purple-500/15 text-purple-500', orange: 'bg-orange-500/15 text-orange-500' },
    glow: 'rgba(99,102,241,0.15)',
  },
  emerald: {
    label: 'Emerald',
    gradient: 'from-emerald-600 to-teal-600',
    btn: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
    ring: 'ring-emerald-300/50',
    tabActive: 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400',
    stat: { blue: 'bg-teal-500/15 text-teal-500', green: 'bg-emerald-500/15 text-emerald-500', purple: 'bg-cyan-500/15 text-cyan-500', orange: 'bg-lime-500/15 text-lime-500' },
    glow: 'rgba(16,185,129,0.15)',
  },
  sunset: {
    label: 'Sunset',
    gradient: 'from-orange-500 to-rose-600',
    btn: 'from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600',
    ring: 'ring-orange-300/50',
    tabActive: 'border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-400',
    stat: { blue: 'bg-orange-500/15 text-orange-500', green: 'bg-rose-500/15 text-rose-500', purple: 'bg-amber-500/15 text-amber-500', orange: 'bg-red-500/15 text-red-500' },
    glow: 'rgba(249,115,22,0.15)',
  },
  ocean: {
    label: 'Ocean',
    gradient: 'from-cyan-600 to-blue-700',
    btn: 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700',
    ring: 'ring-cyan-300/50',
    tabActive: 'border-cyan-500 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400',
    stat: { blue: 'bg-cyan-500/15 text-cyan-500', green: 'bg-sky-500/15 text-sky-500', purple: 'bg-indigo-500/15 text-indigo-500', orange: 'bg-blue-500/15 text-blue-500' },
    glow: 'rgba(6,182,212,0.15)',
  },
};

export const loadAdminPreferences = () => {
  try {
    const raw = localStorage.getItem('adminDashboardPrefs');
    if (raw) return JSON.parse(raw);
  } catch (_) {
    /* ignore */
  }
  return { mode: 'light', accent: 'aurora' };
};

export const saveAdminPreferences = (prefs) => {
  localStorage.setItem('adminDashboardPrefs', JSON.stringify(prefs));
};
