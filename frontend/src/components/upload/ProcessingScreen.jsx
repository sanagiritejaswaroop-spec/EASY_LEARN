import React, { useEffect, useState } from 'react';
import { Sparkles, FileText, Cpu, Database, Network } from 'lucide-react';

export const ProcessingScreen = ({ onComplete }) => {
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    { label: 'PDF uploaded & decrypted', icon: FileText, delay: 600 },
    { label: 'Extracting text & page structures', icon: Cpu, delay: 1300 },
    { label: 'Building TF-IDF Vector Index & Chunks', icon: Database, delay: 2100 },
    { label: 'Analyzing concepts with EASY-LEARN AI', icon: Network, delay: 3000 },
    { label: 'Generating study materials & flashcards', icon: Sparkles, delay: 3800 },
  ];

  useEffect(() => {
    const timers = stages.map((stage, idx) => {
      return setTimeout(() => {
        setCurrentStage(idx + 1);
        if (idx === stages.length - 1) {
          setTimeout(() => {
            onComplete();
          }, 900);
        }
      }, stage.delay);
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 relative z-10">
      {/* Central Clean Slate Core */}
      <div className="relative mb-10">
        <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-xl">
          <FileText className="w-9 h-9 text-slate-300 animate-pulse" />
        </div>
      </div>

      {/* Header Info */}
      <div className="text-center max-w-md mx-auto space-y-2 mb-8">
        <h3 className="text-xl font-bold text-slate-100 font-['Outfit']">
          Processing Document Architecture
        </h3>
        <p className="text-xs text-slate-400">
          Parsing syllabus text into TF-IDF vector indices and active study suites...
        </p>
      </div>

      {/* Stages Checklist */}
      <div className="w-full max-w-md space-y-3 bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = currentStage > idx;
          const isCurrent = currentStage === idx + 1;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                isDone
                  ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                  : isCurrent
                    ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-sm'
                    : 'opacity-40 border-transparent text-slate-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                  isDone
                    ? 'bg-slate-800 text-slate-300'
                    : isCurrent
                      ? 'bg-slate-800 text-slate-100 animate-pulse'
                      : 'bg-slate-950 text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium flex-1">{stage.label}</span>
              {isDone && <span className="text-[10px] font-mono text-slate-400">Done</span>}
              {isCurrent && <span className="text-[10px] font-mono text-slate-400 animate-pulse">Running...</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
