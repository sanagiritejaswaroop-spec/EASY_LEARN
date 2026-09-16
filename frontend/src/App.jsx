import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CosmicBackground } from './components/background/CosmicBackground';
import { CustomCursor } from './components/cursor/CustomCursor';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { FileUpload } from './components/upload/FileUpload';
import { ProcessingScreen } from './components/upload/ProcessingScreen';
import { StudyProvider, useStudy } from './context/StudyContext';
import { X } from 'lucide-react';
import { pageTransition } from './utils/motion';

const AppContent = () => {
  const { docData, isProcessing, setIsProcessing } = useStudy();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleStartProcessing = () => {
    setShowUploadModal(false);
    setIsProcessing(true);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen relative flex flex-col selection:bg-purple-500/30">
      {/* Desktop Custom Interactive Glow Cursor */}
      <CustomCursor />

      {/* Dynamic Cosmic Universe Canvas Background */}
      <CosmicBackground />

      {/* Main App Navbar */}
      <Navbar onOpenUpload={() => setShowUploadModal(true)} />

      {/* Main View Router with Smooth Transitions */}
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div key="processing" variants={pageTransition} initial="initial" animate="animate" exit="exit">
              <ProcessingScreen onComplete={handleProcessingComplete} />
            </motion.div>
          ) : docData ? (
            <motion.div key="dashboard" variants={pageTransition} initial="initial" animate="animate" exit="exit">
              <DashboardPage />
            </motion.div>
          ) : (
            <motion.div key="landing" variants={pageTransition} initial="initial" animate="animate" exit="exit">
              <LandingPage onOpenUpload={() => setShowUploadModal(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* File Upload Modal Overlay */}
      <AnimatePresence>
        {showUploadModal && !docData && !isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-2xl"
            >
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-5 right-5 z-10 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <FileUpload onStartProcessing={handleStartProcessing} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <StudyProvider>
      <AppContent />
    </StudyProvider>
  );
}
