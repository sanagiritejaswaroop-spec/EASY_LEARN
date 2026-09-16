import React, { useEffect, useState } from 'react';
import { CheckSquare, ArrowRight, RotateCcw, CheckCircle, XCircle, Award, Loader2, Filter, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchMCQ } from '../../services/api';
import { MagneticButton } from '../common/MagneticButton';

export const MCQView = () => {
  const { docData, mcqData, setMcqData } = useStudy();

  // Test settings
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('Medium');

  // Test state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { qId: optionId }
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const loadQuestions = async () => {
    if (!docData) return;
    try {
      setLoading(true);
      setIsSubmitted(false);
      setReviewMode(false);
      setCurrentIndex(0);
      setSelectedAnswers({});

      const data = await fetchMCQ(docData.file_id, questionCount, difficulty);
      setQuestions(data.questions || []);
      setMcqData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mcqData && mcqData.questions) {
      setQuestions(mcqData.questions);
    } else {
      loadQuestions();
    }
  }, [docData]);

  const handleSelectOption = (qId, optionId) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsSubmitted(true);
    }
  };

  // Calculate score
  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correct_option_id) {
        score += 1;
      }
    });
    return score;
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Generating interactive MCQs...</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const total = questions.length;
  const score = isSubmitted ? calculateScore() : 0;
  const scorePercentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header & Settings bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-extrabold tracking-tight text-white font-['Outfit']">
              INTERACTIVE MCQ PRACTICE
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Topic: All Document Topics • {total} Questions
          </p>
        </div>

        {/* Configuration Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Count:</span>
            {[10, 20].map((c) => (
              <button
                key={c}
                onClick={() => { setQuestionCount(c); }}
                className={`px-2.5 py-0.5 rounded-md font-bold transition-all ${
                  questionCount === c ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <MagneticButton
            onClick={loadQuestions}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Test</span>
          </MagneticButton>
        </div>
      </div>

      {/* Main Question Flow or Results Card */}
      {!isSubmitted || reviewMode ? (
        currentQ ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id || currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative space-y-6 shadow-2xl"
            >
              {/* Progress Stepper */}
              <div className="flex items-center justify-between text-xs text-slate-400 pb-4 border-b border-white/10">
                <span className="font-semibold text-purple-300 font-mono">
                  Question {currentIndex + 1} of {total}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-[11px] text-slate-300">
                  Topic: {currentQ.topic}
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed font-['Outfit']">
                {currentQ.question}
              </h3>

              {/* Options List */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedAnswers[currentQ.id] === opt.id;
                  const isCorrect = opt.id === currentQ.correct_option_id;

                  let btnStyle = 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300';
                  if (isSelected) {
                    btnStyle = 'bg-purple-500/25 border-purple-500/60 text-white shadow-lg shadow-purple-500/20';
                  }
                  if (isSubmitted && isCorrect) {
                    btnStyle = 'bg-emerald-500/25 border-emerald-500/60 text-emerald-200';
                  } else if (isSubmitted && isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-200';
                  }

                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl text-xs sm:text-sm text-left border transition-all ${btnStyle}`}
                    >
                      <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-white/10 shrink-0">
                        {opt.id}
                      </span>
                      <span className="flex-1 pt-0.5">{opt.text}</span>

                      {isSubmitted && isCorrect && (
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {isSubmitted && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Answer Explanation in Review Mode */}
              {isSubmitted && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200 space-y-1"
                >
                  <span className="font-bold flex items-center gap-1.5 text-purple-300">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Explanation:
                  </span>
                  <p className="leading-relaxed">{currentQ.explanation}</p>
                </motion.div>
              )}

              {/* Stepper Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs text-slate-300 font-semibold border border-white/10"
                >
                  Previous
                </button>

                <MagneticButton
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25"
                >
                  <span>{currentIndex === total - 1 ? (isSubmitted ? 'View Results' : 'Submit Test') : 'Next Question'}</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null
      ) : (
        /* Results Complete Card */
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel p-8 rounded-3xl border border-purple-500/35 text-center space-y-6 max-w-xl mx-auto shadow-2xl"
        >
          <div className="relative w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[2px] shadow-2xl shadow-purple-500/30">
            <div className="w-full h-full bg-[#0d1121] rounded-full flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white font-mono">{score} / {total}</span>
              <span className="text-[10px] text-purple-300 font-bold uppercase">Accuracy Score</span>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white font-['Outfit']">
              MCQ PRACTICE COMPLETED
            </h3>
            <p className="text-sm font-semibold text-gradient-purple mt-1">
              {scorePercentage >= 80 ? '🎉 Outstanding Performance! Exam Ready.' : '👍 Good effort! Review key topics to boost retention.'}
            </p>
          </div>

          <div className="p-4.5 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-400" />
              Performance Overview:
            </span>
            <ul className="space-y-1 text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Review detailed explanations for any missed questions below.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <MagneticButton
              onClick={() => {
                setIsSubmitted(false);
                setCurrentIndex(0);
                setSelectedAnswers({});
              }}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Test</span>
            </MagneticButton>

            <MagneticButton
              onClick={() => {
                setReviewMode(true);
                setCurrentIndex(0);
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-purple-500/25"
            >
              <span>Review Answers</span>
            </MagneticButton>
          </div>
        </motion.div>
      )}
    </div>
  );
};
