import React, { useRef } from 'react';
import { 
  Sparkles, Upload, FileText, CheckSquare, Layers, Award, 
  ArrowRight, ShieldCheck, Zap, BookOpen, Cpu
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import MagneticButton from '../components/common/MagneticButton';
import TiltCard from '../components/common/TiltCard';
import NovaCoreCanvas from '../components/hero/NovaCoreCanvas';
import PdfToKnowledgeVisual from '../components/hero/PdfToKnowledgeVisual';
import { sentenceReveal, wordReveal, staggerContainer } from '../utils/motion';

export const LandingPage = ({ onOpenUpload }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Scroll parallax transforms
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -30]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.4]);

  const headlineWords = "Turn Your Notes Into Your Personal AI Tutor.".split(" ");

  return (
    <div ref={containerRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-28 space-y-24">
      
      {/* Asymmetrical 3D Split Hero Section */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative pt-6 pb-12 lg:py-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Editorial Typography & Action */}
          <div className="lg:col-span-7 space-y-8 text-left relative z-10">
            
            {/* Top Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-mono font-medium shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>EASY-LEARN Architecture • Restrained Intelligence</span>
            </motion.div>

            {/* Word-by-Word Reveal Editorial Heading */}
            <motion.h1
              variants={sentenceReveal}
              initial="hidden"
              animate="visible"
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-100 leading-[1.08] flex flex-wrap gap-x-3.5 gap-y-1"
            >
              {headlineWords.map((word, i) => {
                const isAccent = i >= 5; // "Personal AI Tutor."
                return (
                  <motion.span
                    key={i}
                    variants={wordReveal}
                    className={isAccent ? "text-indigo-300 font-extrabold" : "text-slate-100"}
                  >
                    {word}
                  </motion.span>
                );
              })}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed font-normal"
            >
              Upload academic PDFs, syllabus blueprints, and lecture notes. Our structure-aware parser and TF-IDF engine generate grounded active recall flashcards, mock exams, and instant document Q&A.
            </motion.p>

            {/* Magnetic CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <MagneticButton
                onClick={onOpenUpload}
                strength={0.15}
                className="w-full sm:w-auto"
              >
                <div className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-100 hover:bg-white text-slate-950 text-sm font-bold shadow-md flex items-center justify-center gap-2.5 transition-all duration-200">
                  <Upload className="w-4 h-4" />
                  <span>Upload Study Material</span>
                </div>
              </MagneticButton>

              <a href="#pipeline" className="w-full sm:w-auto">
                <MagneticButton strength={0.15} className="w-full sm:w-auto">
                  <div className="w-full sm:w-auto px-7 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all">
                    <span>Explore Pipeline</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </MagneticButton>
              </a>
            </motion.div>

            {/* Subtle Metadata Trust Indicators */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="pt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono"
            >
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/60 border border-slate-800/80">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>PyMuPDF Parsing</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/60 border border-slate-800/80">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>TF-IDF Indexing</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/60 border border-slate-800/80">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Context Grounded</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: 3D Scientific Visualization Centerpiece */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <NovaCoreCanvas />
          </div>

        </div>
      </motion.section>

      {/* Interactive PDF -> Knowledge Pipeline Showcase Section */}
      <div id="pipeline">
        <PdfToKnowledgeVisual />
      </div>

      {/* Features Showcase Grid with Restrained 3D Tilt Cards */}
      <motion.section 
        id="features" 
        className="space-y-12 scroll-mt-24 pt-12"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-slate-400">
            Comprehensive Learning Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
            Engineered For Exam Mastery
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            A unified suite of tools designed to transform dense courseware into active recall materials.
          </p>
        </div>

        <motion.div 
          variants={staggerContainer(0.08, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: FileText,
              title: 'Document Summarization',
              desc: 'Extract executive overviews and main concepts broken down into structured, digestible summary cards.',
              badge: 'Overview'
            },
            {
              icon: Zap,
              title: 'Important Topics & Weightage',
              desc: 'Identify core exam topics ranked by importance percentages with detailed sub-concept breakdowns.',
              badge: 'Rankings'
            },
            {
              icon: CheckSquare,
              title: 'Interactive MCQ Practice',
              desc: 'Customizable multiple choice question sets with instant explanations and difficulty filters.',
              badge: 'Practice'
            },
            {
              icon: BookOpen,
              title: '2 / 5 / 10-Mark Questions',
              desc: 'Exam-oriented model answers structured into definitions, main points, examples, and conclusions.',
              badge: 'Model Answers'
            },
            {
              icon: Layers,
              title: '3D Flip Flashcards',
              desc: 'Active recall flashcards with smooth 3D CSS perspective flips and mastery status tracking.',
              badge: 'Active Recall'
            },
            {
              icon: Award,
              title: 'Timed Mock Exam Mode',
              desc: 'Realistic timed exam simulations with score reports, strong areas, and revision lists.',
              badge: 'Simulations'
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;

            return (
              <TiltCard key={idx} maxTilt={4} className="p-7 space-y-4 border border-slate-800/80 bg-slate-950/80">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono uppercase font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                    {feature.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100">
                  {feature.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </TiltCard>
            );
          })}
        </motion.div>
      </motion.section>
    </div>
  );
};
