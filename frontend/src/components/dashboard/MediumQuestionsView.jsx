import React, { useEffect, useState } from 'react';
import { ListOrdered, ChevronDown, ChevronUp, BookOpen, CheckCircle, Lightbulb, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchMediumQuestions } from '../../services/api';

export const MediumQuestionsView = () => {
  const { docData, mediumQData, setMediumQData } = useStudy();
  const [questions, setQuestions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(!mediumQData);

  useEffect(() => {
    if (mediumQData && mediumQData.questions) {
      setQuestions(mediumQData.questions);
      if (mediumQData.questions.length > 0) setExpandedId(mediumQData.questions[0].id);
    } else if (docData) {
      const load = async () => {
        try {
          setLoading(true);
          const data = await fetchMediumQuestions(docData.file_id, 5);
          setQuestions(data.questions || []);
          setMediumQData(data);
          if (data.questions && data.questions.length > 0) setExpandedId(data.questions[0].id);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [docData]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Formatting 5-mark structured exam answers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ListOrdered className="w-5 h-5 text-cyan-400" />
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-['Outfit']">
            5-Mark Structured Questions
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Structured university exam format: Introduction, Core Points, Examples & Conclusion
        </p>
      </div>

      {/* Questions Accordion */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isExpanded = expandedId === q.id;

          return (
            <motion.div
              key={q.id || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl"
            >
              {/* Question Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="w-full p-6 text-left flex items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                    5M Q{idx + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white leading-relaxed font-['Outfit']">
                      {q.question}
                    </h3>
                    <span className="inline-block text-[10px] font-mono text-slate-400 mt-1">
                      Topic: {q.topic}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 shrink-0">
                  <span>{isExpanded ? 'Collapse' : 'View Answer'}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Answer Breakdown */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="p-6 pt-0 border-t border-white/10 space-y-6 bg-purple-950/15 overflow-hidden"
                  >
                    {/* Introduction */}
                    <div className="space-y-2 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2 font-['Outfit']">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        1. Introduction
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed p-4 rounded-2xl bg-white/5 border border-white/10">
                        {q.introduction}
                      </p>
                    </div>

                    {/* Main Points */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2 font-['Outfit']">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        2. Core Working Principles
                      </h4>
                      <div className="p-4.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                        {q.main_points?.map((pt, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Practical Example */}
                    {q.example && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2 font-['Outfit']">
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                          3. Real-World Example
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                          {q.example}
                        </p>
                      </div>
                    )}

                    {/* Conclusion */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Outfit']">
                        4. Conclusion Summary
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        {q.conclusion}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
