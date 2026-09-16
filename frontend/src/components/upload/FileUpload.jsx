import React, { useState } from 'react';
import { Upload, FileText, X, AlertTriangle, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadPDF } from '../../services/api';
import { useStudy } from '../../context/StudyContext';
import { MagneticButton } from '../common/MagneticButton';

export const FileUpload = ({ onStartProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const { setDocData, setIsProcessing } = useStudy();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('⚠ Please upload a valid PDF file (.pdf).');
      setSelectedFile(null);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('⚠ File size exceeds 50 MB limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');

    try {
      // Trigger processing screen
      onStartProcessing();

      // Call FastAPI backend to extract & analyze PDF
      const data = await uploadPDF(selectedFile);
      setDocData(data);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong while analyzing your document.');
      setIsProcessing(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Upload Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative glass-card p-8 sm:p-12 text-center transition-all duration-300 overflow-hidden ${
          dragActive
            ? 'scale-[1.02] border-purple-400 bg-purple-950/30 shadow-2xl shadow-purple-500/40'
            : 'border-white/10 hover:border-purple-500/40 hover:bg-white/[0.02]'
        }`}
      >
        {/* Glowing Background Pulse over Drag */}
        <AnimatePresence>
          {dragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-cyan-500/20 to-purple-600/20 blur-xl pointer-events-none"
            />
          )}
        </AnimatePresence>

        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
            {/* Animated Icon Container */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-400 opacity-40 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-[#0b0e1e] border border-purple-500/40 flex items-center justify-center shadow-2xl">
                <Upload className="w-9 h-9 text-purple-400" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight font-['Outfit']">
                Drop your PDF here
              </h3>
              <p className="text-xs text-slate-400 mt-1.5">
                Upload lecture notes, textbook chapters, or exam papers
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-white/10" />
              <span className="text-xs text-slate-500 font-mono uppercase font-bold">or</span>
              <span className="h-px w-12 bg-white/10" />
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleChange}
              />
              <span className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition-all glow-btn">
                <Sparkles className="w-4 h-4" />
                Browse Files
              </span>
            </label>

            <p className="text-[11px] text-slate-500 font-mono">
              Supported format: PDF • Max size: 50 MB
            </p>
          </div>
        ) : (
          /* File Selected Card */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center space-y-6 relative z-10"
          >
            <div className="relative w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center shadow-xl">
              <FileText className="w-8 h-8 text-purple-400" />
            </div>

            <div className="text-center">
              <h4 className="text-lg font-bold text-white max-w-md truncate font-['Outfit']">
                {selectedFile.name}
              </h4>
              <p className="text-xs text-purple-300 mt-1 font-mono">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedFile(null)}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
                title="Remove File"
              >
                <X className="w-4 h-4" />
              </button>

              <MagneticButton
                onClick={handleAnalyze}
                disabled={uploading}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold shadow-xl shadow-purple-500/30"
              >
                <Sparkles className="w-4 h-4" />
                <span>{uploading ? 'Analyzing...' : 'Analyze Document'}</span>
              </MagneticButton>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Error notification */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
