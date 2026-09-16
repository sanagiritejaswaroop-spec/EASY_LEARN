import React, { useEffect, useState, useRef } from 'react';
import { Star, ChevronRight, BookOpen, Key, CheckCircle2, X, Loader2, FileText, Sparkles, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudy } from '../../context/StudyContext';
import { fetchTopics } from '../../services/api';

export const TopicsView = () => {
  const { docData, topicsData, setTopicsData } = useStudy();
  const [loading, setLoading] = useState(!topicsData);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (topicsData || !docData) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchTopics(docData.file_id);
        setTopicsData(data.topics);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [docData, topicsData]);

  // Interactive Orbital Graph for Topics Network
  useEffect(() => {
    if (!topicsData || topicsData.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = 300);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 300;
    };
    window.addEventListener('resize', handleResize);

    const centerX = width / 2;
    const centerY = height / 2;

    const nodes = topicsData.map((topic, i) => {
      const radius = 55 + (i + 1) * 20;
      const speed = 0.002 + (topicsData.length - i) * 0.0005;
      const angle = (i * 2 * Math.PI) / topicsData.length;
      const nodeSize = 5 + (topic.importance_percentage / 100) * 6;
      return {
        ...topic,
        radius,
        speed,
        angle,
        nodeSize,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.5
      };
    });

    let currentHovered = null;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw central AI core
      ctx.save();
      const time = Date.now() * 0.0015;
      const corePulse = 14 + Math.sin(time) * 2;
      
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, corePulse * 2.5);
      coreGlow.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
      coreGlow.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, corePulse * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, corePulse, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
      ctx.restore();

      // 2. Draw orbital rings & connecting rays
      nodes.forEach((node) => {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, node.radius, node.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = node.id === currentHovered?.id 
          ? 'rgba(99, 102, 241, 0.4)' 
          : 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = node.id === currentHovered?.id ? 1.2 : 0.6;
        ctx.stroke();
        ctx.restore();
      });

      // 3. Render orbital nodes
      nodes.forEach((node) => {
        node.angle += node.speed;
        node.x = centerX + Math.cos(node.angle) * node.radius;
        node.y = centerY + Math.sin(node.angle) * node.radius * 0.5;

        const isHovered = currentHovered?.id === node.id;

        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? node.nodeSize * 1.3 : node.nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#818cf8' : '#94a3b8';
        ctx.fill();

        ctx.font = isHovered ? '500 11px monospace' : '10px monospace';
        ctx.fillStyle = isHovered ? '#f1f5f9' : '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(`${node.name} (${node.importance_percentage}%)`, node.x, node.y + node.nodeSize + 12);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = null;
      for (const node of nodes) {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        if (Math.sqrt(dx * dx + dy * dy) < node.nodeSize + 8) {
          found = node;
          break;
        }
      }
      currentHovered = found;
      setHoveredNode(found);
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    const handleClick = () => {
      if (currentHovered) {
        setSelectedTopic(currentHovered);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [topicsData]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <p className="text-xs text-slate-500 font-mono">Extracting topic importance weightage...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">
              Important Topics & Weightage
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Click any topic below to open its detailed <strong>Summarized Matter</strong> and exam notes.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{topicsData?.length || 0} Topics Identified</span>
        </div>
      </div>

      {/* Orbital Topic Network Graph */}
      {topicsData && topicsData.length > 0 && (
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 pb-2 border-b border-slate-800/80 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-300 font-medium">Topic Network Topology</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {hoveredNode ? `Topic: ${hoveredNode.name}` : 'Click node for full summary'}
            </div>
          </div>
          <canvas ref={canvasRef} className="w-full h-[300px] block" />
        </div>
      )}

      {/* Topics Ranking List */}
      <div className="space-y-3">
        {topicsData?.map((topic, idx) => (
          <motion.div
            key={topic.id || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            onClick={() => setSelectedTopic(topic)}
            className="p-4 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200"
          >
            <div className="flex items-center gap-4 flex-1">
              <span className="font-mono text-xs font-semibold text-slate-500 group-hover:text-slate-300 transition-colors w-6">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors flex items-center gap-2">
                  {topic.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                  {topic.short_explanation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
              <div className="w-36 sm:w-48 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${topic.importance_percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + idx * 0.05 }}
                  className="h-full bg-slate-400 rounded-full"
                />
              </div>

              <span className="font-mono text-xs font-semibold text-slate-300 w-12 text-right">
                {topic.importance_percentage}%
              </span>

              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Topic Detail Modal */}
      <AnimatePresence>
        {selectedTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-950 p-6 sm:p-8 border border-slate-800 relative space-y-6 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedTopic(null)}
                className="absolute top-5 right-5 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                  Weightage: {selectedTopic.importance_percentage}%
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mt-2">
                  {selectedTopic.name}
                </h3>
              </div>

              {/* Prominent Summarized Matter Block */}
              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  📖 Summarized Matter & Topic Analysis
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedTopic.detailed_summary || selectedTopic.quick_summary || selectedTopic.short_explanation}
                </p>
              </div>

              {/* Key Takeaway */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  Key Takeaway
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {selectedTopic.short_explanation}
                </p>
              </div>

              {/* What You Should Know */}
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  What You Should Know for Exams
                </h4>
                <ul className="space-y-2">
                  {selectedTopic.what_you_should_know?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Terms */}
              {selectedTopic.key_terms && (
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    Key Vocabulary
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTopic.key_terms.map((term, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
