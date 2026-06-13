import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Target, Award, Calendar } from 'lucide-react';
import { fetchStreak } from '../api';

export default function StatsView({ tasks, streak }) {
  const [values, setValues] = useState({ completed: 0, streak: 0, todayTasks: 0, total: 0 });

  useEffect(() => {
    const completed = tasks.filter((t) => !t.isActive).length;
    const total = tasks.length;
    const todayTasks = tasks.filter((t) => t.createdAt && new Date(t.createdAt).toDateString() === new Date().toDateString()).length;
    const duration = 900;
    const start = Date.now();
    const animate = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValues({
        completed: Math.round(completed * eased),
        total: Math.round(total * eased),
        todayTasks: Math.round(todayTasks * eased),
        streak: Math.round(streak.current * eased),
      });
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [tasks, streak]);

  const completed = tasks.filter((t) => !t.isActive).length;
  const total = tasks.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const categories = {};
  tasks.filter((t) => t.isActive).forEach((task) => { categories[task.category || 'Uncategorized'] = (categories[task.category || 'Uncategorized'] || 0) + 1; });
  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="text-xs font-bold uppercase tracking-[2px] text-indigo-600 dark:text-indigo-400 mb-1">Insights</div>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Statistics</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Your productivity at a glance.</p>
      </motion.div>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        {[
          { icon: Target, label: 'Tasks Completed', value: `${values.completed}/${values.total}`, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
          { icon: TrendingUp, label: 'Day Streak', value: values.streak, color: streak.broken ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400', bg: streak.broken ? 'bg-rose-500/10' : 'bg-emerald-500/10' },
          { icon: Calendar, label: 'Created Today', value: values.todayTasks, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
          { icon: Award, label: 'Completion Rate', value: `${rate}%`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            whileHover={{ y: -4 }}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} dark:${stat.bg.replace('/10', '/20')} flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div className={`text-3xl font-extrabold ${stat.color} tracking-tight`}>{stat.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</div>
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl mix-blend-overlay ${stat.bg} opacity-60`} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl relative overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BarChart3 size={18} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Category Breakdown</h3>
        </div>

        {entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map(([category, count]) => {
              const pct = Math.round((count / total) * 100);
              const catColor = (['work', 'personal', 'health', 'learning'].includes(category.toLowerCase()))
                ? { work: 'from-indigo-500 to-violet-600', personal: 'from-violet-500 to-purple-600', health: 'from-emerald-500 to-teal-500', learning: 'from-amber-500 to-orange-600' }[category.toLowerCase()]
                : 'from-indigo-400 to-violet-400';

              return (
                <div key={category}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{category}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{count} task{count !== 1 ? 's' : ''} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${catColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">No active tasks to analyze.</p>
        )}

        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/8 dark:from-indigo-500/12 to-violet-500/8 dark:to-violet-500/12 blur-2xl mix-blend-overlay" />
      </motion.div>
    </div>
  );
}