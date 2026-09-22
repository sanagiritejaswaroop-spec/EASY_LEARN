import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CosmicBackground } from './components/background/CosmicBackground';
import { CustomCursor } from './components/cursor/CustomCursor';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeUniverseUpload } from './components/upload/KnowledgeUniverseUpload';
import { StudyProvider, useStudy } from './context/StudyContext';
import { pageTransition } from './utils/motion';

const AppContent = () => {
  const { docData, isProcessing } = useStudy();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleUploadClose = () => {
    setShowUploadModal(false);
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
  };

  return (
    <div className="min-h-screen relative flex flex-col selection:bg-[#6366f1]/30">
      {/* Desktop Custom Interactive Glow Cursor */}
      <CustomCursor />

      {/* Dynamic Cosmic Universe Canvas Background */}
      <CosmicBackground />

      {/* Main App Navbar */}
      <Navbar onOpenUpload={() => setShowUploadModal(true)} />

      {/* Main View Router with Smooth Transitions */}
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {docData && !isProcessing ? (
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

      {/* Cinematic Knowledge Universe PDF Upload & Processing Experience */}
      <AnimatePresence>
        {(showUploadModal || isProcessing) && !docData && (
          <motion.div
            key="knowledge-upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50"
          >
            <KnowledgeUniverseUpload
              onClose={handleUploadClose}
              onComplete={handleUploadComplete}
            />
          </motion.div>
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
