import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, CheckCircle, Layers, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchSummary } from '../../services/api';

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

      {/* Core Conceptual Pillars — Knowledge Constellation */}
      <div className="relative">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-200 font-['Outfit'] flex items-center gap-2">
                <span>Core Conceptual Pillars</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              </h3>
              <span className="text-[10px] font-mono text-slate-400 tracking-wider">KNOWLEDGE CONSTELLATION MAP</span>
            </div>
          </div>

          {/* Subtle Constellation Path Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="w-5 h-px bg-indigo-500/40" />
            <span className="w-2 h-2 rounded-full bg-indigo-300" />
            <span className="w-5 h-px bg-indigo-500/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
        </div>

        {/* Section Atmospheric Background Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Constellation Container */}
        <div className="relative">
          {/* Faint Constellation Background Connecting Lines (Desktop/Laptop) */}
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none -z-10 opacity-30" overflow="visible">
            <defs>
              <linearGradient id="constellationGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Row 1 Connections */}
            <path d="M 16% 25% Q 33% 18%, 50% 25% T 84% 25%" fill="none" stroke="url(#constellationGrad)" strokeWidth="1" strokeDasharray="3 4" />
            {/* Inter-Row Vertical/Diagonal Paths */}
            <path d="M 16% 25% Q 24% 50%, 16% 75%" fill="none" stroke="url(#constellationGrad)" strokeWidth="1" strokeDasharray="3 4" />
            <path d="M 50% 25% Q 62% 50%, 50% 75%" fill="none" stroke="url(#constellationGrad)" strokeWidth="1" strokeDasharray="3 4" />
            <path d="M 84% 25% Q 76% 50%, 84% 75%" fill="none" stroke="url(#constellationGrad)" strokeWidth="1" strokeDasharray="3 4" />
            {/* Row 2 Connections */}
            <path d="M 16% 75% Q 33% 82%, 50% 75% T 84% 75%" fill="none" stroke="url(#constellationGrad)" strokeWidth="1" strokeDasharray="3 4" />

            {/* Junction Nodes */}
            <circle cx="16%" cy="25%" r="2.5" fill="#818cf8" />
            <circle cx="50%" cy="25%" r="2.5" fill="#818cf8" />
            <circle cx="84%" cy="25%" r="2.5" fill="#818cf8" />
            <circle cx="16%" cy="75%" r="2.5" fill="#818cf8" />
            <circle cx="50%" cy="75%" r="2.5" fill="#818cf8" />
            <circle cx="84%" cy="75%" r="2.5" fill="#818cf8" />
          </svg>

          {/* Pillars Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {main_concepts?.map((concept, idx) => {
              const cleanTitle = (concept.title || '').replace(/:$/, '').trim();
              const numFormatted = concept.number || `${idx + 1 < 10 ? '0' : ''}${idx + 1}`;
              const variant = idx % 3;

              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="group relative p-6 sm:p-7 rounded-2xl bg-[#080d1a]/90 border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between min-h-[190px] shadow-xl hover:shadow-indigo-500/15 overflow-hidden backdrop-blur-sm"
                >
                  {/* Illuminated Technical Corner Brackets */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500/40 group-hover:border-indigo-400 group-hover:shadow-[0_0_6px_rgba(129,140,248,0.8)] transition-all duration-300" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-500/40 group-hover:border-indigo-400 group-hover:shadow-[0_0_6px_rgba(129,140,248,0.8)] transition-all duration-300" />

                  {/* Atmospheric Inner Glow */}
                  <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-600/10 group-hover:bg-indigo-600/20 rounded-full blur-2xl transition-all duration-500 pointer-events-none" />

                  {/* Knowledge Node Vector Visualization (Varies organically by index) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 group-hover:opacity-75 transition-opacity duration-300" overflow="visible">
                    {variant === 0 && (
                      <g transform="translate(180, 45)">
                        <circle cx="0" cy="0" r="24" fill="none" stroke="rgba(129,140,248,0.2)" strokeWidth="0.8" strokeDasharray="3 3" />
                        <circle cx="0" cy="0" r="3" fill="#818cf8" className="group-hover:animate-ping" />
                        <circle cx="0" cy="0" r="3.5" fill="#818cf8" />
                        <circle cx="17" cy="-17" r="1.5" fill="rgba(199,210,254,0.8)" />
                        <circle cx="-19" cy="14" r="1.5" fill="rgba(199,210,254,0.8)" />
                        <line x1="-19" y1="14" x2="0" y2="0" stroke="rgba(129,140,248,0.25)" strokeWidth="0.8" />
                      </g>
                    )}

                    {variant === 1 && (
                      <g transform="translate(200, 75)">
                        <ellipse cx="0" cy="0" rx="28" ry="18" fill="none" stroke="rgba(129,140,248,0.2)" strokeWidth="0.8" strokeDasharray="2 2" transform="rotate(-15)" />
                        <circle cx="0" cy="0" r="3.5" fill="#818cf8" />
                        <circle cx="22" cy="-8" r="2" fill="rgba(199,210,254,0.8)" />
                        <circle cx="-20" cy="10" r="1.5" fill="rgba(199,210,254,0.7)" />
                        <line x1="0" y1="0" x2="22" y2="-8" stroke="rgba(129,140,248,0.3)" strokeWidth="0.8" />
                      </g>
                    )}

                    {variant === 2 && (
                      <g transform="translate(190, 110)">
                        <path d="M -25 0 A 25 25 0 0 1 25 0" fill="none" stroke="rgba(129,140,248,0.25)" strokeWidth="0.8" strokeDasharray="3 2" />
                        <circle cx="0" cy="0" r="3.5" fill="#818cf8" />
                        <circle cx="-16" cy="-18" r="1.5" fill="rgba(199,210,254,0.8)" />
                        <circle cx="18" cy="-16" r="1.5" fill="rgba(199,210,254,0.8)" />
                        <line x1="-16" y1="-18" x2="18" y2="-16" stroke="rgba(129,140,248,0.2)" strokeWidth="0.8" />
                      </g>
                    )}
                  </svg>

                  {/* Top Technical Index */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 group-hover:text-indigo-300 uppercase">
                        {numFormatted}
                      </span>
                      <span className="text-slate-700 text-[10px] font-mono">/</span>
                      <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-semibold">CONCEPT</span>
                    </div>

                    {/* Small Status Node Indicator */}
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400 group-hover:shadow-[0_0_6px_rgba(129,140,248,0.9)] transition-all duration-300" />
                    </div>
                  </div>

                  {/* Center Topic Heading */}
                  <div className="my-5 relative z-10">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-100 group-hover:text-white font-['Outfit'] uppercase tracking-wide leading-snug break-words">
                      {cleanTitle}
                    </h4>
                  </div>

                  {/* Bottom Decorative Technical Line */}
                  <div className="flex items-center gap-2 relative z-10">
                    <div className="w-6 h-0.5 bg-indigo-500/40 group-hover:w-10 group-hover:bg-indigo-400 transition-all duration-300 rounded-full" />
                    <div className="w-1 h-1 rounded-full bg-indigo-500/40 group-hover:bg-indigo-300 transition-all duration-300" />
                  </div>
                </motion.div>
              );
            })}
          </div>
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
