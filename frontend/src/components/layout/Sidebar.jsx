import React from 'react';
import { 
  FileText, Star, HelpCircle, CheckSquare, ListOrdered, 
  BookOpen, Layers, Award, MessageSquareText, Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';

export const Sidebar = () => {
  const { activeView, setActiveView } = useStudy();

  const navItems = [
    { id: 'summary', label: 'Summary', icon: FileText, badge: 'Overview' },
    { id: 'topics', label: 'Important Topics', icon: Star, badge: 'Top 95%' },
    { id: 'mcq', label: 'MCQ Test', icon: CheckSquare, badge: 'Interactive' },
    { id: 'short', label: '2-Mark Questions', icon: HelpCircle, badge: 'Short' },
    { id: 'medium', label: '5-Mark Questions', icon: ListOrdered, badge: 'Structured' },
    { id: 'long', label: '10-Mark Questions', icon: BookOpen, badge: 'Essay' },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, badge: '3D Flip' },
    { id: 'mock', label: 'Mock Exam', icon: Award, badge: 'Timed' },
    { id: 'chat', label: 'Ask EASY-LEARN', icon: MessageSquareText, badge: 'AI Chat' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-950/80 border-r border-slate-800/80 p-4 shrink-0 min-h-[calc(100vh-4rem)] sticky top-16">
        <div className="mb-4 px-2 flex items-center justify-between">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Study Navigation
          </span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        </div>

        <nav className="space-y-1 flex-1 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'text-slate-100 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {/* Active Indicator Background Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarTab"
                    className="absolute inset-0 rounded-lg bg-slate-900 border border-slate-700/80 shadow-sm z-0"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="relative z-10 flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive 
                        ? 'bg-slate-800 text-slate-200 border border-slate-700/60' 
                        : 'bg-slate-900/40 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info card */}
        <div className="mt-auto pt-4 border-t border-slate-800/80 px-2">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Study Protocol</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Combine active recall Flashcards with Mock Exam mode for optimal retention.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 border-t border-slate-800 px-2 py-1.5 flex items-center justify-around overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition-all min-w-[56px] ${
                isActive
                  ? 'text-slate-100 font-bold bg-slate-900 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[48px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
