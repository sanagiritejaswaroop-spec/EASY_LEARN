import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, AlertCircle, RefreshCw, X, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { uploadPDF } from '../../services/api';
import { useStudy } from '../../context/StudyContext';

export const KnowledgeUniverseUpload = ({ onClose, onComplete }) => {
  const canvasRef = useRef(null);
  const { setDocData, setIsProcessing } = useStudy();

  // Experience States: 'idle' | 'reading' | 'extracting' | 'structuring' | 'connecting' | 'galaxy' | 'ready' | 'error'
  const [stage, setStage] = useState('idle');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedConcepts, setExtractedConcepts] = useState([]);
  const [conceptPositions, setConceptPositions] = useState([]);

  // Refs for zero-rerender animation loop tracking
  const stageRef = useRef('idle');
  const dragActiveRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const realConceptsRef = useRef([]);
  const backendResultRef = useRef(null);
  const backendErrorRef = useRef(null);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    dragActiveRef.current = dragActive;
  }, [dragActive]);

  // Main Canvas Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let animationId;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    };

    handleResize();

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 350 : 900;

    let time = 0;

    // Mouse Tracking
    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX - window.innerWidth / 2);
      mouseRef.current.targetY = (e.clientY - window.innerHeight / 2);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    // Initialize Particles for Gravitational Portal / Document / Constellation / Galaxy
    const particles = [];
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const maxDim = Math.max(window.innerWidth, window.innerHeight);
    const maxParticleRadius = maxDim * (isMobile ? 0.65 : 0.75);

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.pow(Math.random(), 0.8) * maxParticleRadius;
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.55,
        z: (Math.random() - 0.5) * 400,
        baseRadius: radius,
        angle: angle,
        orbitSpeed: (0.002 + Math.random() * 0.005) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.5 + 0.6,
        alpha: Math.random() * 0.65 + 0.2,
        color: Math.random() > 0.85 ? '#93c5fd' : Math.random() > 0.95 ? '#fef08a' : '#6366f1',
        vx: 0,
        vy: 0,
        vz: 0,
        clusterIndex: Math.floor(Math.random() * 6),
      });
    }

    // 6 Luminous Constellation Nodes
    const nodes = [];
    const nodeCount = 6;
    for (let i = 0; i < nodeCount; i++) {
      const a = (i * 2 * Math.PI) / nodeCount + (Math.PI / 6);
      const r = minDim * (isMobile ? 0.35 : 0.42);
      nodes.push({
        baseX: Math.cos(a) * r,
        baseY: Math.sin(a) * r * 0.55,
        x: Math.cos(a) * r,
        y: Math.sin(a) * r * 0.55,
        size: i % 2 === 0 ? 6.5 : 5.0,
        pulse: Math.random() * Math.PI * 2,
        label: '',
      });
    }

    // Tab visibility handling
    let isTabActive = true;
    const handleVisibility = () => {
      isTabActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Single unified 60FPS Render Loop
    const render = () => {
      if (!isTabActive) {
        animationId = requestAnimationFrame(render);
        return;
      }

      time += 0.016;

      const w = window.innerWidth;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const centerX = canvas.width / (2 * dpr);
      const centerY = canvas.height / (2 * dpr);

      const currentStage = stageRef.current;
      const isDrag = dragActiveRef.current;

      // 1. Render Gravitational Portal Ambient Bloom & Concentric Orbital Rings (Strictly Centered & Immersive)
      if (currentStage === 'idle' || currentStage === 'reading') {
        const portalRadius = (isMobile ? minDim * 0.24 : minDim * 0.30) * (isDrag ? 1.15 : 1.0);

        // Perfectly Centered Expansive Core Gradient Bloom
        const grad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          portalRadius * 2.5
        );
        grad.addColorStop(0, isDrag ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.25)');
        grad.addColorStop(0.4, isDrag ? 'rgba(147, 197, 253, 0.18)' : 'rgba(147, 197, 253, 0.08)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, portalRadius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 3 Concentric Orbital Rings (Strictly Symmetrical & Viewport Spanning)
        const ringCount = 3;
        for (let rIdx = 0; rIdx < ringCount; rIdx++) {
          const rRadius = portalRadius * (0.85 + rIdx * 0.55);
          const spin = time * (0.2 + rIdx * 0.1) * (rIdx % 2 === 0 ? 1 : -1);

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.scale(1.0, 0.52); // Symmetrical 3D perspective ellipse

          ctx.strokeStyle = isDrag
            ? rIdx === 0 ? 'rgba(147, 197, 253, 0.7)' : 'rgba(99, 102, 241, 0.45)'
            : rIdx === 0 ? 'rgba(147, 197, 253, 0.35)' : 'rgba(99, 102, 241, 0.2)';
          ctx.lineWidth = rIdx === 0 ? 1.8 : 1.0;
          ctx.setLineDash(rIdx === 1 ? [8, 8] : [14, 6]);
          ctx.lineDashOffset = -spin * 30;

          ctx.beginPath();
          ctx.arc(0, 0, rRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 2. Render Particles Movement (Strictly Centered & Expansive)
      ctx.globalCompositeOperation = 'lighter';

      const updatedNodePositions = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (currentStage === 'idle') {
          // Swirling portal gravity
          const dragSpeedMult = isDrag ? 2.8 : 1.0;
          p.angle += p.orbitSpeed * dragSpeedMult;
          const currentR = p.baseRadius * (isDrag ? 0.75 : 1.0) + Math.sin(time * 2 + i) * 8;
          p.x = Math.cos(p.angle) * currentR;
          p.y = Math.sin(p.angle) * currentR * 0.55;
        } else if (currentStage === 'reading') {
          // Floating 3D pages orbit around document center
          p.angle += p.orbitSpeed * 1.5;
          p.x += (Math.cos(p.angle) * minDim * 0.38 - p.x) * 0.05;
          p.y += (Math.sin(p.angle) * minDim * 0.38 * 0.55 - p.y) * 0.05;
        } else if (currentStage === 'extracting') {
          // Pages dissolve & burst into space
          p.x += (Math.cos(p.angle) * maxDim * 0.55 - p.x) * 0.04 + (Math.random() - 0.5) * 4;
          p.y += (Math.sin(p.angle) * maxDim * 0.55 * 0.55 - p.y) * 0.04 + (Math.random() - 0.5) * 4;
        } else if (currentStage === 'structuring' || currentStage === 'connecting') {
          // Gravitate towards concept cluster nodes
          const targetNode = nodes[p.clusterIndex % nodes.length];
          const tx = targetNode.x + Math.sin(time * 3 + i) * 35;
          const ty = targetNode.y + Math.cos(time * 3 + i) * 35;
          p.x += (tx - p.x) * 0.06;
          p.y += (ty - p.y) * 0.06;
        } else if (currentStage === 'galaxy' || currentStage === 'ready') {
          // Form compact miniature spiral galaxy
          p.angle += (0.012 + (1 - p.baseRadius / (w * 0.75)) * 0.02);
          const galaxyR = p.baseRadius * (currentStage === 'ready' ? 1.6 : 0.85);
          const targetX = Math.cos(p.angle) * galaxyR;
          const targetY = Math.sin(p.angle) * galaxyR * 0.55; // spiral inclination
          p.x += (targetX - p.x) * 0.08;
          p.y += (targetY - p.y) * 0.08;
        } else if (currentStage === 'error') {
          // Disperse outward gently
          p.x += Math.cos(p.angle) * 3.5;
          p.y += Math.sin(p.angle) * 3.5;
        }

        const scrX = centerX + p.x;
        const scrY = centerY + p.y;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (currentStage === 'ready' ? 0.3 : 1.0);
        ctx.beginPath();
        ctx.arc(scrX, scrY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Render Constellation Nodes & Connecting Lines (Stage: structuring, connecting, galaxy)
      if (currentStage === 'structuring' || currentStage === 'connecting' || currentStage === 'galaxy') {
        const concepts = realConceptsRef.current;

        // Draw Thin Constellation Lines between Nodes
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.22)';
        ctx.lineWidth = 1;

        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          const n1X = centerX + n1.x;
          const n1Y = centerY + n1.y;

          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const n2X = centerX + n2.x;
            const n2Y = centerY + n2.y;

            ctx.beginPath();
            ctx.moveTo(n1X, n1Y);
            ctx.lineTo(n2X, n2Y);
            ctx.stroke();
          }
        }

        // Render Luminous Node Orbs
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          node.pulse += 0.04;
          const scrX = centerX + node.x;
          const scrY = centerY + node.y;

          const conceptLabel = concepts[i] || '';

          updatedNodePositions.push({
            id: i,
            x: scrX,
            y: scrY,
            label: conceptLabel,
          });

          // Node Halo Glow
          const haloRad = (node.size + Math.sin(node.pulse) * 2.5) * 2.5;
          const haloGrad = ctx.createRadialGradient(scrX, scrY, 0, scrX, scrY, haloRad);
          haloGrad.addColorStop(0, 'rgba(147, 197, 253, 0.8)');
          haloGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
          haloGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(scrX, scrY, haloRad, 0, Math.PI * 2);
          ctx.fill();

          // Core Node Bullet
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(scrX, scrY, node.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;

      // Update concept floating label screen positions
      if (currentStage === 'connecting' || currentStage === 'galaxy') {
        setConceptPositions(updatedNodePositions);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Handle Drag Events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (stage === 'idle') setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startDocumentTransformation(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      startDocumentTransformation(e.target.files[0]);
    }
  };

  // Initiate Document Processing & Cinematic Stage Pipeline
  const startDocumentTransformation = async (file) => {
    setErrorMessage('');
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document (.pdf).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Document size exceeds the 50 MB limit.');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    // Reset Backend References
    backendResultRef.current = null;
    backendErrorRef.current = null;

    // Start Async Backend PDF Processing Concurrently
    const uploadTask = uploadPDF(file)
      .then((data) => {
        backendResultRef.current = data;
        const concepts = data.concepts && data.concepts.length > 0
          ? data.concepts
          : data.headings && data.headings.length > 0
            ? data.headings.slice(0, 6)
            : ['Core Concepts', 'Vector Chunks', 'Key Factors', 'Principles', 'Structural Notes', 'Synthesis'];
        realConceptsRef.current = concepts;
        setExtractedConcepts(concepts);
      })
      .catch((err) => {
        backendErrorRef.current = err.message || 'We couldn\'t map this document.';
      });

    // Execute Cinematic Visual Stages Sequence
    // Stage 1: READING YOUR MATERIAL
    setStage('reading');
    await new Promise((r) => setTimeout(r, 900));

    if (backendErrorRef.current) return triggerErrorState();

    // Stage 2: EXTRACTING KNOWLEDGE
    setStage('extracting');
    await new Promise((r) => setTimeout(r, 1300));

    if (backendErrorRef.current) return triggerErrorState();

    // Stage 3: STRUCTURING CONCEPTS
    setStage('structuring');
    await new Promise((r) => setTimeout(r, 1100));

    if (backendErrorRef.current) return triggerErrorState();

    // Wait for backend result if not already resolved
    await uploadTask;
    if (backendErrorRef.current) return triggerErrorState();

    // Stage 4: CONNECTING IDEAS (Displays Real Extracted Concept Constellation Labels)
    setStage('connecting');
    await new Promise((r) => setTimeout(r, 1500));

    // Stage 5: BUILDING YOUR KNOWLEDGE UNIVERSE
    setStage('galaxy');
    await new Promise((r) => setTimeout(r, 1400));

    // Stage 6: YOUR KNOWLEDGE UNIVERSE IS READY
    setStage('ready');
    await new Promise((r) => setTimeout(r, 1200));

    // Finish & Transition to Dashboard seamlessly
    if (backendResultRef.current) {
      setDocData(backendResultRef.current);
    }
    setIsProcessing(false);
    if (onComplete) onComplete();
  };

  const triggerErrorState = () => {
    setStage('error');
    setErrorMessage(backendErrorRef.current || 'We couldn\'t map this document.');
    setIsProcessing(false);
  };

  const handleRetry = () => {
    setStage('idle');
    setSelectedFile(null);
    setErrorMessage('');
    realConceptsRef.current = [];
    setExtractedConcepts([]);
  };

  const stageTitles = {
    reading: 'READING YOUR MATERIAL',
    extracting: 'EXTRACTING KNOWLEDGE',
    structuring: 'STRUCTURING CONCEPTS',
    connecting: 'CONNECTING IDEAS',
    galaxy: 'BUILDING YOUR KNOWLEDGE UNIVERSE',
    ready: 'YOUR KNOWLEDGE UNIVERSE IS READY',
  };

  const stageSubtitles = {
    reading: 'Parsing page vectors and structural hierarchies...',
    extracting: 'Deconstructing text into TF-IDF semantic particles...',
    structuring: 'Clustering technical keywords and thematic domains...',
    connecting: 'Mapping concept links into an active knowledge star chart...',
    galaxy: 'Organizing knowledge clusters into your interactive universe...',
    ready: 'Transitioning into your study environment...',
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070a11] text-slate-100 overflow-hidden select-none"
    >
      {/* 1. Canvas Interactive Particle System */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* 2. Top Bar Navigation / Close Button */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md text-xs font-mono text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>EASY-LEARN Universe Engine</span>
        </div>

        {onClose && stage === 'idle' && (
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all backdrop-blur-md"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Floating Concept Labels during Constellation & Galaxy Stages */}
      {(stage === 'connecting' || stage === 'galaxy') && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <AnimatePresence>
            {conceptPositions.map((pos) => {
              if (!pos.label) return null;
              return (
                <motion.div
                  key={pos.id}
                  initial={{ opacity: 0, scale: 0.8, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4, delay: pos.id * 0.08 }}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y - 28}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className="absolute px-3 py-1 rounded-md bg-slate-900/80 border border-indigo-500/30 text-[11px] font-mono font-medium text-indigo-200 backdrop-blur-md shadow-lg flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span>{pos.label}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 4. Core UI Centerpiece */}
      <div className="relative z-10 max-w-xl w-full px-6 text-center space-y-6 pointer-events-auto">
        
        {/* A. INITIAL UPLOAD STATE */}
        {stage === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Gravitational Portal Interactive Drop Target */}
            <div
              onClick={() => document.getElementById('pdf-file-input')?.click()}
              className={`relative mx-auto w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border ${
                dragActive
                  ? 'border-indigo-400/80 bg-indigo-500/10 scale-105 shadow-2xl shadow-indigo-500/30'
                  : 'border-slate-800/80 bg-slate-950/40 hover:border-indigo-500/40 hover:bg-slate-900/40'
              }`}
            >
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Upload className={`w-7 h-7 ${dragActive ? 'text-indigo-300 animate-bounce' : 'text-indigo-400'}`} />
                </div>
                <span className="text-xs font-mono tracking-wider font-semibold text-slate-300 uppercase">
                  {dragActive ? 'Release to Enter' : 'Gravitational Portal'}
                </span>
              </div>
            </div>

            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Typography */}
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-['Outfit']">
                ENTER YOUR KNOWLEDGE
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed font-normal">
                Drop your study material and build your learning universe.
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-4">
              <label htmlFor="pdf-file-input" className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95">
                  <FileText className="w-4 h-4 text-slate-900" />
                  Browse Files
                </span>
              </label>

              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest font-semibold">
                PDF • MAX 50 MB
              </span>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* B. 3D FLOATING DOCUMENT & PROCESSING STAGES (1 to 6) */}
        {stage !== 'idle' && stage !== 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Visual 3D Document / Particle Core Centerpiece */}
            <div className="relative mx-auto w-32 h-40 sm:w-40 sm:h-52 flex items-center justify-center">
              {/* 3D Floating Document Card */}
              <motion.div
                animate={
                  stage === 'reading'
                    ? { rotateY: [0, 15, -15, 0], rotateX: [0, 8, -8, 0], y: [0, -8, 0] }
                    : stage === 'extracting'
                      ? { scale: [1, 1.1, 0], opacity: [1, 0.8, 0], rotateZ: [0, 45] }
                      : { scale: 0, opacity: 0 }
                }
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/40 p-5 shadow-2xl flex flex-col justify-between text-left relative overflow-hidden backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-indigo-300" />
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300/80">PDF</span>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 w-3/4 rounded bg-indigo-400/40" />
                  <div className="h-1.5 w-1/2 rounded bg-indigo-400/20" />
                  <div className="h-1.5 w-5/6 rounded bg-indigo-400/20" />
                </div>

                <div className="text-[9px] font-mono text-slate-500 truncate">
                  {selectedFile ? selectedFile.name : 'Document.pdf'}
                </div>
              </motion.div>
            </div>

            {/* Stage Title & Subtitle */}
            <div className="space-y-2">
              <motion.h3
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 font-['Outfit']"
              >
                {stageTitles[stage]}
              </motion.h3>
              <p className="text-xs sm:text-sm text-slate-400 font-mono">
                {stageSubtitles[stage]}
              </p>
            </div>

            {/* Stage Progress Dots */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {['reading', 'extracting', 'structuring', 'connecting', 'galaxy', 'ready'].map((stg, idx) => {
                const stageOrder = ['reading', 'extracting', 'structuring', 'connecting', 'galaxy', 'ready'];
                const currentIdx = stageOrder.indexOf(stage);
                const isPassed = currentIdx >= idx;
                const isCurrent = currentIdx === idx;

                return (
                  <div
                    key={stg}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isCurrent
                        ? 'w-8 bg-indigo-400 shadow-md shadow-indigo-500/50'
                        : isPassed
                          ? 'w-3 bg-indigo-600/60'
                          : 'w-1.5 bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* C. ERROR STATE */}
        {stage === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 mx-auto flex items-center justify-center text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
                WE COULDN'T MAP THIS DOCUMENT
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {errorMessage || 'The document format could not be parsed into a knowledge universe.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4 text-slate-900" />
                <span>Try another PDF</span>
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default KnowledgeUniverseUpload;
