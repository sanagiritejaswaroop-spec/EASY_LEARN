import React from 'react';
import { Sparkles, FileText, RefreshCw, Upload, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import MagneticButton from '../common/MagneticButton';

export const Navbar = ({ onOpenUpload }) => {
  const { docData, resetSession } = useStudy();

  return (
    <header className="sticky top-4 z-50 max-w-5xl mx-auto px-4 sm:px-6 transition-all duration-300">
      <div className="w-full rounded-full bg-slate-950/85 border border-slate-800/80 shadow-xl backdrop-blur-xl px-4 sm:px-6 py-2.5 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => !docData && onOpenUpload && onOpenUpload()}
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white font-['Outfit']">
              EASY-LEARN
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              <Cpu className="w-2.5 h-2.5 text-indigo-400" />
              AI Core
            </span>
          </div>
        </motion.div>

        {/* Active Document Status or Upload CTA */}
        {docData ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium truncate max-w-[160px]">{docData.filename}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{docData.total_pages} Pages</span>
            </div>
            
            <MagneticButton strength={0.15} onClick={resetSession}>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 font-semibold transition-all cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">New Document</span>
              </div>
            </MagneticButton>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <MagneticButton strength={0.15} onClick={onOpenUpload}>
              <div className="flex items-center gap-2 px-4 py-1.5 sm:py-2 rounded-full bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF</span>
              </div>
            </MagneticButton>
          </div>
        )}

      </div>
    </header>
  );
};
