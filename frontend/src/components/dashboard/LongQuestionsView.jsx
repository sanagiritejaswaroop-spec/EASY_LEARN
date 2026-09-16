import React, { useEffect, useState } from 'react';
import { BookOpen, Layers, CheckCircle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchLongQuestions } from '../../services/api';

export const LongQuestionsView = () => {
  const { docData, longQData, setLongQData } = useStudy();
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(!longQData);

  useEffect(() => {
    if (longQData && longQData.questions) {
      setQuestions(longQData.questions);
    } else if (docData) {
      const load = async () => {
        try {
          setLoading(true);
          const data = await fetchLongQuestions(docData.file_id, 3);
          setQuestions(data.questions || []);
          setLongQData(data);
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
        <p className="text-xs text-slate-400 font-mono">Synthesizing 10-mark long essay answers...</p>
      </div>
    );
  }

  const currentQ = questions[activeTab];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-['Outfit']">
            10-Mark Essay Questions
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          In-depth essay answers with definitions, architectural steps, trade-offs, and practical examples
        </p>
      </div>

      {/* Tabs selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 relative">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
              activeTab === idx
                ? 'text-white border-purple-500/50 shadow-lg shadow-purple-500/20'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {activeTab === idx && (
              <motion.div
                layoutId="activeLongQuestionTab"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/50 z-0"
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            <span className="relative z-10 font-mono">Question {idx + 1}</span>
            <span className="relative z-10 text-[10px] opacity-75 font-normal truncate max-w-[120px]">{q.topic}</span>
          </button>
        ))}
      </div>

      {/* Selected Question View */}
      {currentQ && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id || activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-8 shadow-2xl"
          >
            {/* Title */}
            <div className="border-b border-white/10 pb-6">
              <span className="text-[10px] font-bold font-mono uppercase px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                10-Mark Long Answer Format
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit'] mt-3 leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* Section 1: Definition */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2 font-['Outfit']">
                <BookOpen className="w-4 h-4 text-purple-400" />
                1. Definition & Core Concept
              </h4>
              <div className="p-4 rounded-2xl bg-purple-950/25 border border-purple-500/30 text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                {currentQ.definition}
              </div>
            </div>

            {/* Section 2: Detailed Explanation */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2 font-['Outfit']">
                <Layers className="w-4 h-4 text-cyan-400" />
                2. Detailed Architecture & Working Mechanism
              </h4>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {currentQ.detailed_explanation}
              </div>
            </div>

            {/* Section 3: Steps or Types */}
            {currentQ.steps_or_types && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2 font-['Outfit']">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  3. Key Operational Steps / Sub-types
                </h4>
                <div className="space-y-2">
                  {currentQ.steps_or_types.map((step, sIdx) => (
                    <div key={sIdx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-3 font-mono">
                      <span className="font-bold text-amber-400 shrink-0">Step {sIdx + 1}</span>
                      <span className="font-sans font-normal">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Practical Example */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-['Outfit']">
                4. Practical Implementation Example
              </h4>
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 text-xs sm:text-sm text-emerald-200 leading-relaxed">
                {currentQ.practical_example}
              </div>
            </div>

            {/* Section 5: Advantages & Disadvantages */}
            {currentQ.pros_and_cons && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Advantages */}
                <div className="p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <h5 className="text-xs font-bold uppercase text-emerald-300 flex items-center gap-1.5 font-['Outfit']">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                    Advantages
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentQ.pros_and_cons.advantages?.map((adv, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Disadvantages */}
                <div className="p-4.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                  <h5 className="text-xs font-bold uppercase text-rose-300 flex items-center gap-1.5 font-['Outfit']">
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                    Disadvantages
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentQ.pros_and_cons.disadvantages?.map((dis, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-400">•</span>
                        <span>{dis}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Section 6: Conclusion */}
            <div className="pt-4 border-t border-white/10 space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-['Outfit']">
                5. Exam Summary & Conclusion
              </h4>
              <p className="text-xs text-slate-300 italic">
                {currentQ.conclusion}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
