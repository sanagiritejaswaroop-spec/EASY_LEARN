import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, CheckCircle, Layers, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchSummary } from '../../services/api';
import { TiltCard } from '../common/TiltCard';

export const SummaryView = () => {
  const { docData, summaryData, setSummaryData } = useStudy();
  const [loading, setLoading] = useState(!summaryData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (summaryData || !docData) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchSummary(docData.file_id);
        setSummaryData(data);
      } catch (err) {
        setError('Failed to load document summary.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [docData, summaryData]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Synthesizing document summary & core pillars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 glass-card border-red-500/30 text-red-300 text-sm">
        {error}
      </div>
    );
  }

  const { overview, main_concepts, key_takeaways } = summaryData || {};

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-['Outfit']">
            Executive Document Summary
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Executive AI overview and key conceptual pillars from {docData?.filename}
        </p>
      </div>

      {/* Overview Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center gap-2 font-['Outfit']">
          <BookOpen className="w-4 h-4 text-purple-400" />
          Executive Overview
        </h3>
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
          {overview}
        </p>
      </motion.div>

      {/* Main Concepts Grid with 3D TiltCards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2 font-['Outfit']">
          <Layers className="w-4 h-4 text-cyan-400" />
          Core Conceptual Pillars
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {main_concepts?.map((concept, idx) => (
            <TiltCard key={idx} maxTilt={5} className="p-6 space-y-3">
              <span className="inline-block text-2xl font-extrabold font-mono text-gradient-purple mb-1">
                {concept.number}
              </span>
              <h4 className="text-base font-bold text-white font-['Outfit']">
                {concept.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {concept.description}
              </p>
            </TiltCard>
          ))}
        </div>
      </div>

      {/* Key Takeaways */}
      {key_takeaways && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2 font-['Outfit']">
            <CheckCircle className="w-4 h-4 text-purple-400" />
            High-Yield Exam Takeaways
          </h3>

          <ul className="space-y-3">
            {key_takeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <span className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
};
