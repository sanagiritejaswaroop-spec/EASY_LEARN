import React, { useEffect, useState } from 'react';
import { Layers, ChevronLeft, ChevronRight, RotateCw, CheckCircle, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchFlashcards } from '../../services/api';
import { MagneticButton } from '../common/MagneticButton';

export const FlashcardsView = () => {
  const { docData, flashcardData, setFlashcardData } = useStudy();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(!flashcardData);

  useEffect(() => {
    if (flashcardData && flashcardData.flashcards) {
      setCards(flashcardData.flashcards);
    } else if (docData) {
      const load = async () => {
        try {
          setLoading(true);
          const data = await fetchFlashcards(docData.file_id, 12);
          setCards(data.flashcards || []);
          setFlashcardData(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [docData]);

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMarkKnown = () => {
    setKnownCount((prev) => prev + 1);
    handleNext();
  };

  const handleMarkReview = () => {
    setReviewCount((prev) => prev + 1);
    handleNext();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Building 3D interactive active-recall flashcards...</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const total = cards.length;

  return (
    <div className="space-y-8 max-w-3xl mx-auto text-center">
      {/* Header */}
      <div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-purple-400" />
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-['Outfit']">
            3D ACTIVE RECALL FLASHCARDS
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Click card to trigger 3D perspective flip and test memory retention
        </p>
      </div>

      {/* Progress & Stats Bar */}
      <div className="flex items-center justify-between px-5 py-2.5 rounded-2xl glass-panel border border-white/10 text-xs font-semibold shadow-lg">
        <div className="flex items-center gap-2 text-emerald-400 font-mono">
          <CheckCircle className="w-4 h-4" />
          <span>Known: {knownCount}</span>
        </div>

        <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold">
          Card {currentIndex + 1} / {total}
        </div>

        <div className="flex items-center gap-2 text-amber-400 font-mono">
          <RefreshCw className="w-4 h-4" />
          <span>Review: {reviewCount}</span>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      {currentCard && (
        <div 
          className="perspective-1000 w-full max-w-xl mx-auto h-84 cursor-pointer select-none" 
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative transform-style-3d shadow-2xl rounded-3xl"
          >
            {/* FRONT OF CARD */}
            <div className="absolute inset-0 w-full h-full glass-panel border-2 border-purple-500/40 rounded-3xl p-8 flex flex-col justify-between items-center text-center backface-hidden bg-gradient-to-br from-purple-950/40 via-[#0d1121] to-[#070913] shadow-2xl">
              <div className="w-full flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase font-bold text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentCard.topic}
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {currentCard.difficulty}
                </span>
              </div>

              <div className="my-auto px-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed font-['Outfit']">
                  {currentCard.front}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs text-purple-300 font-medium opacity-80">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Click card to flip answer</span>
              </div>
            </div>

            {/* BACK OF CARD */}
            <div className="absolute inset-0 w-full h-full glass-panel border-2 border-cyan-500/40 rounded-3xl p-8 flex flex-col justify-between items-center text-center backface-hidden rotate-y-180 bg-gradient-to-br from-cyan-950/40 via-[#0d1121] to-[#070913] shadow-2xl">
              <div className="w-full flex items-center justify-between text-xs text-cyan-400 font-mono uppercase font-bold">
                <span>Concept Explanation</span>
                <span>{currentCard.topic}</span>
              </div>

              <div className="my-auto px-4">
                <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-normal">
                  {currentCard.back}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium opacity-80">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Click to flip back to question</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between max-w-xl mx-auto pt-2">
        <MagneticButton
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-semibold text-slate-300 border border-white/10"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </MagneticButton>

        <div className="flex items-center gap-3">
          <MagneticButton
            onClick={handleMarkReview}
            className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Review Again</span>
          </MagneticButton>

          <MagneticButton
            onClick={handleMarkKnown}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-300"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>I Know This</span>
          </MagneticButton>
        </div>

        <MagneticButton
          onClick={handleNext}
          disabled={currentIndex === total - 1}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-semibold text-slate-300 border border-white/10"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </MagneticButton>
      </div>
    </div>
  );
};
