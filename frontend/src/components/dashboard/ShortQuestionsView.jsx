import React, { useEffect, useState } from 'react';
import { HelpCircle, Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchShortQuestions } from '../../services/api';
import { MagneticButton } from '../common/MagneticButton';

export const ShortQuestionsView = () => {
  const { docData, shortQData, setShortQData } = useStudy();
  const [questions, setQuestions] = useState([]);
  const [openAnswers, setOpenAnswers] = useState({}); // { qId: boolean }
  const [loading, setLoading] = useState(!shortQData);

  const loadQuestions = async () => {
    if (!docData) return;
    try {
      setLoading(true);
      const data = await fetchShortQuestions(docData.file_id, 8);
      setQuestions(data.questions || []);
      setShortQData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shortQData && shortQData.questions) {
      setQuestions(shortQData.questions);
    } else {
      loadQuestions();
    }
  }, [docData]);

  const toggleAnswer = (id) => {
    setOpenAnswers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Synthesizing 2-mark short questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-extrabold tracking-tight text-white font-['Outfit']">
              2-Mark Questions & Definitions
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Concise, exam-oriented definition and short answer preparation
          </p>
        </div>

        <MagneticButton
          onClick={loadQuestions}
          className="px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 font-bold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate More</span>
        </MagneticButton>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isOpen = !!openAnswers[q.id];

          return (
            <motion.div
              key={q.id || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                    Q{idx + 1}
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

                <button
                  onClick={() => toggleAnswer(q.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-medium transition-all shrink-0"
                >
                  {isOpen ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-purple-400" />
                      <span>Hide Answer</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Show Answer</span>
                    </>
                  )}
                </button>
              </div>

              {/* Answer Content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="p-4.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs sm:text-sm text-purple-100 leading-relaxed font-normal overflow-hidden"
                  >
                    <span className="font-bold text-purple-300 mr-2 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Model Answer:
                    </span>
                    {q.answer}
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
