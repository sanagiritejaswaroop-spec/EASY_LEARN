import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Cpu, Database, Sparkles, ArrowRight, CheckCircle2, Layers, Search, Zap } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';

const PIPELINE_STAGES = [
  {
    id: 'extract',
    step: '01',
    title: 'Structure-Aware Extraction',
    subtitle: 'PDF Intake & Parsing',
    icon: FileText,
    badge: 'PyMuPDF Engine',
    description: 'Ingests academic PDFs, syllabus blueprints, and lecture notes. Cleans raw formatting while preserving page indices, headings, tables, and section hierarchies.',
    metrics: [
      { label: 'Extraction Rate', value: '100%' },
      { label: 'Structure Lock', value: 'Active' },
      { label: 'Format Preserved', value: 'Markdown + Text' }
    ],
    visualData: [
      { text: 'CH 04: Quantum Chromodynamics', highlight: true },
      { text: 'Page 42 • Section 4.2 • Vector Potentials', highlight: false },
      { text: 'Extracting 1,420 paragraphs across 28 pages...', highlight: false }
    ]
  },
  {
    id: 'chunk',
    step: '02',
    title: 'Intelligent Window Chunking',
    subtitle: 'Semantic Fragmenting',
    icon: Layers,
    badge: 'Overlap Math',
    description: 'Breaks document stream into optimal 400-word contextual windows with 60-word overlapping margins to eliminate boundary context loss.',
    metrics: [
      { label: 'Window Size', value: '400 words' },
      { label: 'Boundary Margin', value: '60 words' },
      { label: 'Context Retention', value: '99.8%' }
    ],
    visualData: [
      { text: 'Chunk #014 [P.12-14]: "Field strength tensor F_mu_nu..."', highlight: true },
      { text: 'Chunk #015 [P.14-16]: "Non-Abelian gauge symmetry in SU(3)..."', highlight: true },
      { text: 'Chunk #016 [P.16-17]: "Asymptotic freedom & coupling constant..."', highlight: false }
    ]
  },
  {
    id: 'vector',
    step: '03',
    title: 'TF-IDF Hybrid Indexing',
    subtitle: 'High-Dimensional Vector Space',
    icon: Database,
    badge: 'Instant Retrieval',
    description: 'Generates term frequency & inverse document frequency vectors. Builds sub-millisecond search indices mapping user queries directly to exact source text.',
    metrics: [
      { label: 'Query Latency', value: '< 2.4 ms' },
      { label: 'Index Density', value: 'High' },
      { label: 'Relevance Score', value: '98.4%' }
    ],
    visualData: [
      { text: 'Vector Node #402: {term: "gauge", weight: 0.9412}', highlight: true },
      { text: 'Vector Node #403: {term: "lagrangian", weight: 0.8842}', highlight: true },
      { text: 'TF-IDF Match [Q: "gauge symmetry"] -> 0.962', highlight: true }
    ]
  },
  {
    id: 'generate',
    step: '04',
    title: 'Context-Grounded AI Intelligence',
    subtitle: 'Context-Grounded AI Generation',
    icon: Sparkles,
    badge: 'Zero Hallucination',
    description: 'Feeds retrieved precision context into the EASY-LEARN AI Engine to generate grounded summaries, active recall flashcards, practice questions, and direct Q&A responses.',
    metrics: [
      { label: 'Engine', value: 'EASY-LEARN AI' },
      { label: 'Groundedness', value: '100%' },
      { label: 'Output Suite', value: 'Full Study Kit' }
    ],
    visualData: [
      { text: 'Generating 5 Flashcards from Chunk #014 - #018', highlight: true },
      { text: 'Synthesizing Executive Summary with Key Takeaways', highlight: true },
      { text: 'Formulating 10 Exam-Grade MCQs with Rationales', highlight: true }
    ]
  }
];

export default function PdfToKnowledgeVisual() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const activeStage = PIPELINE_STAGES[activeStageIndex];

  return (
    <section className="relative py-20 overflow-hidden z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 mb-4 text-xs font-mono text-slate-300"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Architecture & Transformation Pipeline</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 mb-4"
          >
            From Raw PDF to Structured Knowledge
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-400 text-sm sm:text-base leading-relaxed"
          >
            An end-to-end pipeline that ingests documents, constructs structured TF-IDF indices, and generates grounded study materials.
          </motion.p>
        </div>

        {/* Pipeline Navigation / Flow Line */}
        <div className="relative mb-10">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-1/2 left-12 right-12 h-px -translate-y-1/2 bg-slate-800 z-0">
            <motion.div 
              className="h-full bg-indigo-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${((activeStageIndex + 1) / PIPELINE_STAGES.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {PIPELINE_STAGES.map((stage, idx) => {
              const StageIcon = stage.icon;
              const isActive = activeStageIndex === idx;

              return (
                <MagneticButton key={stage.id} strength={0.1} className="w-full">
                  <button
                    onClick={() => setActiveStageIndex(idx)}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 border ${
                      isActive 
                        ? 'bg-slate-900 border-indigo-500/50 shadow-md text-white' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}>
                        <StageIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-500">
                        {stage.step}
                      </span>
                    </div>

                    <h3 className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>
                      {stage.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {stage.subtitle}
                    </p>
                  </button>
                </MagneticButton>
              );
            })}
          </div>
        </div>

        {/* Detailed Stage Preview Box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-xl relative overflow-hidden"
          >
            {/* Stage Left Info */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium text-slate-300 bg-slate-900 border border-slate-800">
                    {activeStage.badge}
                  </span>
                  <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Stage {activeStageIndex + 1}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-3">
                  {activeStage.title}
                </h3>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                  {activeStage.description}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
                  {activeStage.metrics.map((metric, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      <div className="text-[11px] text-slate-400 font-medium mb-1 truncate">{metric.label}</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-100 font-mono truncate">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Prompt */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <span className="text-xs text-slate-500 font-mono">
                  Stage {activeStageIndex + 1} of {PIPELINE_STAGES.length}
                </span>
                <MagneticButton strength={0.15}>
                  <button
                    onClick={() => setActiveStageIndex((prev) => (prev + 1) % PIPELINE_STAGES.length)}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white border border-slate-800 transition-colors"
                  >
                    <span>Next Stage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </MagneticButton>
              </div>
            </div>

            {/* Stage Right Terminal Stream Visual */}
            <div className="lg:col-span-6 rounded-xl bg-slate-900/80 border border-slate-800/80 p-5 font-mono text-xs text-slate-300 relative flex flex-col justify-between">
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="ml-2 text-slate-400 text-[11px] font-sans">EASY-LEARN Engine Stream</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Zap className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] tracking-wide uppercase font-semibold">ACTIVE</span>
                </div>
              </div>

              {/* Dynamic Code / Log Visual Output */}
              <div className="py-4 space-y-2.5 font-mono text-[11px]">
                {activeStage.visualData.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.1 }}
                    className={`p-2.5 rounded-lg border transition-all ${
                      item.highlight 
                        ? 'bg-slate-950/80 border-slate-700/80 text-slate-200' 
                        : 'bg-slate-950/40 border-slate-800/50 text-slate-400'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-bold shrink-0">&gt;</span>
                      <span className="leading-relaxed break-all">{item.text}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Terminal Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-slate-500 text-[11px]">
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>TF-IDF Search & Generation</span>
                </div>
                <div className="text-slate-400 font-mono">
                  Thread #0{activeStageIndex + 1}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
