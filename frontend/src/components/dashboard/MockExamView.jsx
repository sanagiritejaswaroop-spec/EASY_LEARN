import React, { useEffect, useState } from 'react';
import { Award, Clock, CheckCircle2, AlertCircle, RotateCcw, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchMockExam } from '../../services/api';
import { MagneticButton } from '../common/MagneticButton';

export const MockExamView = () => {
  const { docData, mockExamData, setMockExamData } = useStudy();

  const [examState, setExamState] = useState('idle'); // idle, active, submitted
  const [examPaper, setExamPaper] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 mins in seconds
  const [userAnswers, setUserAnswers] = useState({}); // { qId: answer }
  const [loading, setLoading] = useState(false);

  const loadExam = async () => {
    if (!docData) return;
    try {
      setLoading(true);
      const data = await fetchMockExam(docData.file_id, 30);
      setExamPaper(data);
      setMockExamData(data);
      setTimeLeft((data.time_limit_minutes || 30) * 60);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mockExamData) {
      setExamPaper(mockExamData);
      setTimeLeft((mockExamData.time_limit_minutes || 30) * 60);
    } else {
      loadExam();
    }
  }, [docData]);

  // Timer Countdown Effect
  useEffect(() => {
    if (examState !== 'active') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setExamState('submitted');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examState]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartExam = () => {
    setUserAnswers({});
    setExamState('active');
  };

  const handleSubmitExam = () => {
    setExamState('submitted');
  };

  const calculateResults = () => {
    if (!examPaper) return { totalScore: 0, percentage: 0, strong: [], weak: [] };

    let totalScore = 0;
    const topicScores = {};

    examPaper.questions.forEach((q) => {
      const topic = q.topic || 'General';
      if (!topicScores[topic]) topicScores[topic] = { correct: 0, total: 0 };
      topicScores[topic].total += q.marks;

      if (q.type === 'mcq') {
        if (userAnswers[q.id] === q.correct_option_id) {
          totalScore += q.marks;
          topicScores[topic].correct += q.marks;
        }
      } else {
        // Short / Medium text questions get awarded full marks if user entered text
        if (userAnswers[q.id] && userAnswers[q.id].trim().length > 10) {
          totalScore += q.marks;
          topicScores[topic].correct += q.marks;
        }
      }
    });

    const percentage = Math.round((totalScore / examPaper.total_marks) * 100);
    const strong = [];
    const weak = [];

    Object.entries(topicScores).forEach(([t, s]) => {
      const ratio = s.total > 0 ? s.correct / s.total : 0;
      if (ratio >= 0.7) strong.push(t);
      else weak.push(t);
    });

    return { totalScore, percentage, strong, weak };
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Assembling full mock exam paper...</p>
      </div>
    );
  }

  const results = examState === 'submitted' ? calculateResults() : null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* State 1: Pre-Exam Launcher */}
      {examState === 'idle' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel p-8 sm:p-12 rounded-3xl border border-purple-500/35 text-center space-y-6 max-w-2xl mx-auto shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8 text-purple-400" />
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-white font-['Outfit']">
              MOCK EXAM MODE
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-mono">
              Test your exam readiness under realistic timed exam constraints
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto py-2">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-xl font-bold font-mono text-purple-300">
                {examPaper?.total_questions || 20}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Questions</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-xl font-bold font-mono text-cyan-300">
                {examPaper?.time_limit_minutes || 30}m
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Time Limit</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="block text-xl font-bold font-mono text-amber-300">
                {examPaper?.total_marks || 35}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Marks</span>
            </div>
          </div>

          <MagneticButton
            onClick={handleStartExam}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-extrabold shadow-xl shadow-purple-500/30 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Exam Now</span>
          </MagneticButton>
        </motion.div>
      )}

      {/* State 2: Active Timed Exam */}
      {examState === 'active' && (
        <div className="space-y-6">
          {/* Fixed Timer Header */}
          <div className="sticky top-20 z-30 flex items-center justify-between glass-panel p-4.5 rounded-2xl border border-purple-500/35 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-white text-sm font-['Outfit']">Exam in Progress</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200 font-mono text-sm font-bold">
              <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Time Remaining: {formatTime(timeLeft)}</span>
            </div>

            <MagneticButton
              onClick={handleSubmitExam}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-500/25"
            >
              Submit Exam
            </MagneticButton>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {examPaper?.questions.map((q, idx) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Question {idx + 1} • [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{q.topic}</span>
                </div>

                <h3 className="text-base font-bold text-white leading-relaxed font-['Outfit']">
                  {q.question}
                </h3>

                {/* MCQ option choices */}
                {q.type === 'mcq' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setUserAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                        className={`p-3.5 rounded-2xl text-xs text-left border transition-all flex items-center gap-3 ${
                          userAnswers[q.id] === opt.id
                            ? 'bg-purple-500/25 border-purple-500/60 text-white font-semibold shadow-lg shadow-purple-500/15'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-white/10">{opt.id}</span>
                        <span>{opt.text}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Short / Medium essay response textarea */}
                {q.type !== 'mcq' && (
                  <div className="pt-2">
                    <textarea
                      rows={3}
                      value={userAnswers[q.id] || ''}
                      onChange={(e) => setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Type your exam response here..."
                      className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* State 3: Exam Results Dashboard */}
      {examState === 'submitted' && results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-purple-500/35 text-center space-y-6 shadow-2xl">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[2px] mx-auto shadow-2xl shadow-purple-500/30">
              <div className="w-full h-full bg-[#0d1121] rounded-full flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white font-mono">{results.percentage}%</span>
                <span className="text-[10px] text-purple-300 font-bold uppercase">Accuracy</span>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-white font-['Outfit']">
                EXAM COMPLETED
              </h2>
              <p className="text-xs font-mono text-purple-300 mt-1">
                Total Score: {results.totalScore} / {examPaper?.total_marks} Marks
              </p>
            </div>

            {/* Performance breakdown grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* Strong Areas */}
              <div className="p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <h4 className="text-xs font-bold uppercase text-emerald-300 flex items-center gap-2 font-['Outfit']">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Strong Areas
                </h4>
                <ul className="space-y-1 text-xs text-slate-300 font-mono">
                  {results.strong.length > 0 ? (
                    results.strong.map((t, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{t}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 italic">No specific strong areas yet.</li>
                  )}
                </ul>
              </div>

              {/* Needs Revision */}
              <div className="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <h4 className="text-xs font-bold uppercase text-amber-300 flex items-center gap-2 font-['Outfit']">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Needs Revision
                </h4>
                <ul className="space-y-1 text-xs text-slate-300 font-mono">
                  {results.weak.length > 0 ? (
                    results.weak.map((t, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{t}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 italic">Great job! All topics mastered.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <MagneticButton
                onClick={() => setExamState('idle')}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Exam</span>
              </MagneticButton>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
