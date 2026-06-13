import { motion } from 'framer-motion';
import { Home, CalendarDays, NotebookPen, BarChart3 } from 'lucide-react';

const navItems = [
  { id: 'today', icon: Home, label: 'Today', gradient: 'from-indigo-500 to-violet-600' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendar', gradient: 'from-violet-500 to-purple-600' },
  { id: 'notes', icon: NotebookPen, label: 'Notes', gradient: 'from-cyan-500 to-indigo-500' },
  { id: 'stats', icon: BarChart3, label: 'Stats', gradient: 'from-amber-500 to-orange-500' },
];

export default function Sidebar({ activeTab, setActiveTab, taskCount }) {
  return (
    <aside className="fixed left-4 top-24 bottom-6 w-64 z-30 hidden lg:block">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-3xl p-4 shadow-xl h-full flex flex-col relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-2xl mix-blend-overlay animate-float" />

        <div className="px-3 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500 dark:text-slate-400">
            Menu
          </span>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1 relative">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-300 ${
                  isActive
                    ? 'text-white shadow-lg dark:text-slate-50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-2xl shadow-lg`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-3 w-full">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className="shrink-0"
                  />
                  <span className="font-medium text-sm">{item.label}</span>

                  {item.id === 'today' && taskCount > 0 && (
                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/80 text-indigo-600 dark:bg-white/90 dark:text-indigo-400'
                        : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                    }`}>
                      {taskCount}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}