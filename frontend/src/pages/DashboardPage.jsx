import React from 'react';
import { FileText, CheckCircle2, BookOpen, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../context/StudyContext';
import { Sidebar } from '../components/layout/Sidebar';
import { SummaryView } from '../components/dashboard/SummaryView';
import { TopicsView } from '../components/dashboard/TopicsView';
import { MCQView } from '../components/dashboard/MCQView';
import { ShortQuestionsView } from '../components/dashboard/ShortQuestionsView';
import { MediumQuestionsView } from '../components/dashboard/MediumQuestionsView';
import { LongQuestionsView } from '../components/dashboard/LongQuestionsView';
import { FlashcardsView } from '../components/dashboard/FlashcardsView';
import { MockExamView } from '../components/dashboard/MockExamView';
import { AskNovaView } from '../components/dashboard/AskNovaView';
import { pageTransition } from '../utils/motion';

export const DashboardPage = () => {
  const { docData, activeView } = useStudy();

  const renderActiveView = () => {
    switch (activeView) {
      case 'summary':
        return <SummaryView />;
      case 'topics':
        return <TopicsView />;
      case 'mcq':
        return <MCQView />;
      case 'short':
        return <ShortQuestionsView />;
      case 'medium':
        return <MediumQuestionsView />;
      case 'long':
        return <LongQuestionsView />;
      case 'flashcards':
        return <FlashcardsView />;
      case 'mock':
        return <MockExamView />;
      case 'chat':
        return <AskNovaView />;
      default:
        return <SummaryView />;
    }
  };

  return (
    <div className="relative z-10 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Top Welcome Banner */}
      <div className="glass-panel border-b border-white/10 px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
              Active Workspace
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2 mt-0.5">
              <FileText className="w-6 h-6 text-purple-400 shrink-0" />
              <span className="truncate max-w-xl">{docData?.filename || 'Document'}</span>
            </h1>
          </div>

          {/* Metadata pill */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 font-mono">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>{docData?.estimated_chapters || 12} Chapters</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{docData?.total_pages || 86} Pages</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>RAG Index Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto pb-24 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
