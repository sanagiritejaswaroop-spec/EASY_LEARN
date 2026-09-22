import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Calendar, Clock, Sparkles, AlertCircle, ArrowRight, 
  CheckCircle2, RefreshCw, Zap, BookOpen, Award, Layers, ShieldCheck,
  ChevronRight, Play, Trophy, AlertTriangle, X
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { generateExamMission, adaptExamMission } from '../../services/api';
import MagneticButton from '../common/MagneticButton';

export const ExamMissionView = () => {
  const { docData, examMissionData, setExamMissionData, setActiveView } = useStudy();

  const fileId = docData?.file_id;

  // View States: 'entry' | 'time-collapse' | 'mission-view' | 'checkpoint' | 'adapting'
  const [viewMode, setViewMode] = useState('entry');
  const [daysInput, setDaysInput] = useState(5);
  const [examDate, setExamDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Day in Timeline
  const [selectedDayNum, setSelectedDayNum] = useState(1);

  // Status message sequence for TIME COLLAPSE animation
  const [stageIndex, setStageIndex] = useState(0);
  const stages = [
    'READING YOUR MATERIAL',
    'MAPPING YOUR SYLLABUS',
    'UNDERSTANDING TOPIC RELATIONSHIPS',
    'ESTIMATING STUDY EFFORT',
    'ALLOCATING YOUR TIME',
    'BALANCING REVISION',
    'BUILDING YOUR EXAM PULSE',
    'PULSE READY'
  ];

  // Checkpoint Quiz State
  const [activeCheckpointDay, setActiveCheckpointDay] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [checkpointResult, setCheckpointResult] = useState(null);

  // Adaptation Notification State
  const [adaptationMessage, setAdaptationMessage] = useState('');

  // Canvas Refs for Time Collapse & Day Constellation Engine
  const timeCollapseCanvasRef = useRef(null);
  const constellationCanvasRef = useRef(null);

  // Load existing mission from context or localStorage if available
  useEffect(() => {
    if (examMissionData) {
      if (examMissionData.days && examMissionData.days.length) {
        setDaysInput(examMissionData.days.length);
      }
      setSelectedDayNum(1);
    } else if (fileId) {
      const saved = localStorage.getItem(`exam_mission_${fileId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setExamMissionData(parsed);
          if (parsed.days && parsed.days.length) {
            setDaysInput(parsed.days.length);
          }
          setSelectedDayNum(1);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [fileId]);

  // Handle Exam Date change -> Auto calculate remaining days
  const handleDateChange = (e) => {
    const val = e.target.value;
    setExamDate(val);
    if (val) {
      const target = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      if (diffDays > 0) {
        setDaysInput(Math.min(30, diffDays));
      }
    }
  };

  // Helper to extract clean topics excluding metadata
  const getCleanTopics = () => {
    const rawHeadings = docData?.headings || [];
    const rawConcepts = docData?.concepts || [];
    const all = [...rawHeadings, ...rawConcepts];

    const isMeta = (txt) => {
      if (!txt || typeof txt !== 'string') return true;
      const t = txt.trim().toLowerCase();
      if (t.length < 3 || t.length > 55) return true;
      if (t.includes('pbr vits') || t.includes('b.tech') || t.includes('m.tech') || t.includes('cse-ai') || t.includes('aiml')) return true;
      if (t.includes('james allen') || t.includes('instructor') || t.includes('pearson') || t.includes('textbook') || t.includes('autonomous')) return true;
      if (t.includes('department') || t.includes('university') || t.includes('college') || t.includes('syllabus')) return true;
      return false;
    };

    const clean = [];
    all.forEach((item) => {
      const trimmed = item.replace(/^(Chapter|Unit|Module|\d+\.|\d+\.\d+)\s*/i, '').trim();
      if (!isMeta(trimmed) && !clean.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        clean.push(trimmed);
      }
    });

    if (clean.length === 0) {
      return ["Foundations & Core Principles", "Generic Systems", "Syntactic Structure", "Semantic Analysis", "Final Review"];
    }
    return clean.slice(0, 16);
  };

  // 1. KNOWLEDGE FORGE Signature Cinematic Canvas Animation Engine
  useEffect(() => {
    if (viewMode !== 'knowledge-forge') return;

    const canvas = timeCollapseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let animId;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateCanvasDimensions = () => {
      if (!canvas) return;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);

    const isMobile = window.innerWidth < 768;
    const targetDays = daysInput || 5;
    const topicsList = getCleanTopics();

    const maxDimInit = Math.max(window.innerWidth, window.innerHeight);
    const maxFieldRadius = maxDimInit * (isMobile ? 0.58 : 0.72);

    // Map extracted topics to Knowledge Particles (Expansive Spatial Spread)
    const particles = topicsList.map((topName, idx) => {
      const angle = (idx * 2 * Math.PI) / topicsList.length;
      const assignedDay = (idx % targetDays) + 1;
      const radius = (0.25 + (idx / topicsList.length) * 0.72) * maxFieldRadius;
      return {
        id: idx,
        name: topName,
        angle: angle,
        baseRadius: radius,
        currentRadius: radius * 1.5,
        targetRadius: radius,
        assignedDay: assignedDay,
        speed: (0.006 + (idx % 4) * 0.003) * (idx % 2 === 0 ? 1 : -1),
        size: isMobile ? 4.5 : 6.5,
        alpha: 0,
        stageProgress: 0,
        x: 0,
        y: 0,
      };
    });

    let time = 0;
    let forgeProgress = 0; // 0.0 to 1.0 sequence progress over ~2.8 seconds

    const render = () => {
      time += 0.03;
      forgeProgress = Math.min(1.0, forgeProgress + 0.006); // ~2.8s timeline

      const w = window.innerWidth;
      const h = window.innerHeight;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const minDim = Math.min(w, h);
      const maxDim = Math.max(w, h);
      const centerX = w / 2;
      const centerY = h / 2;

      // STAGE DEFINITIONS BASED ON PROGRESS
      // Phase 1 (0 - 0.22): KNOWLEDGE FIELD (Topics floating across viewport)
      // Phase 2 (0.22 - 0.50): TIME CORE IGNITION & TOPIC FORGING
      // Phase 3 (0.50 - 0.78): TOPIC CONSTELLATIONS & DAY CHECKPOINTS
      // Phase 4 (0.78 - 0.92): DAY-BY-DAY TRANSFORMATION & REVISION LINK
      // Phase 5 (0.92 - 1.0): MISSION READY

      // A. RENDER EXPANSIVE CENTRAL TIME CORE ENGINE (Occupies ~30-40% Viewport Height)
      const coreIntensity = forgeProgress < 0.2 ? forgeProgress / 0.2 : 1.0;
      const coreR = (isMobile ? minDim * 0.13 : minDim * 0.16) + Math.sin(time * 2.5) * 5;

      // 1. Expansive Core Ambient Glow Bloom
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreR * 3.0);
      coreGrad.addColorStop(0, `rgba(99, 102, 241, ${0.45 * coreIntensity})`);
      coreGrad.addColorStop(0.45, `rgba(147, 197, 253, ${0.20 * coreIntensity})`);
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreR * 3.0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multi-Ring Spinning Tick Engine
      const ringR1 = coreR * 1.35;
      const ringR2 = coreR * 1.75;
      const ringR3 = coreR * 2.15;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Ring 1: Outer Ring with Tick Marks
      ctx.save();
      ctx.rotate(time * 0.2);
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ringR1, 0, Math.PI * 2);
      ctx.stroke();

      const tickCount = 48;
      for (let tIdx = 0; tIdx < tickCount; tIdx++) {
        const tAngle = (tIdx * 2 * Math.PI) / tickCount;
        const tickLen = tIdx % 6 === 0 ? 10 : 5;
        const innerX = Math.cos(tAngle) * (ringR1 - tickLen);
        const innerY = Math.sin(tAngle) * (ringR1 - tickLen);
        const outerX = Math.cos(tAngle) * ringR1;
        const outerY = Math.sin(tAngle) * ringR1;

        ctx.strokeStyle = tIdx % 6 === 0 ? 'rgba(147, 197, 253, 0.75)' : 'rgba(99, 102, 241, 0.35)';
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();
      }
      ctx.restore();

      // Ring 2: Counter-Rotating Dashed Orbit Ring
      ctx.save();
      ctx.rotate(-time * 0.3);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, ringR2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Ring 3: Outer Atmospheric Pulse Ring
      ctx.save();
      ctx.rotate(time * 0.12);
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, ringR3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // B. SPATIALLY SEPARATED DAY NODES
      const dayNodePositions = [];
      const isTimelinePhase = forgeProgress >= 0.75;
      const timelineLerp = isTimelinePhase ? Math.min(1.0, (forgeProgress - 0.75) / 0.15) : 0;

      for (let d = 1; d <= targetDays; d++) {
        // Wide Radial Orbit Position (Phase 2 & 3)
        const dAngle = ((d - 1) * 2 * Math.PI) / targetDays - (Math.PI / 2);
        const dRadialR = minDim * (isMobile ? 0.30 : 0.38);
        const radialX = centerX + Math.cos(dAngle) * dRadialR;
        const radialY = centerY + Math.sin(dAngle) * dRadialR * 0.65;

        // Horizontal Timeline Position (Phase 4 & 5)
        const timelineWidth = Math.min(w * 0.88, targetDays * (isMobile ? 85 : 160));
        const startX = centerX - timelineWidth / 2;
        const stepX = targetDays > 1 ? timelineWidth / (targetDays - 1) : 0;
        const timelineX = startX + (d - 1) * stepX;
        const timelineY = centerY + (isMobile ? 140 : 210);

        // Smooth Lerp from Wide Orbit to Horizontal Timeline
        const posX = radialX + (timelineX - radialX) * timelineLerp;
        const posY = radialY + (timelineY - radialY) * timelineLerp;

        dayNodePositions.push({ day: d, x: posX, y: posY });
      }

      // C. RENDER EXPANSIVE TOPIC PARTICLES & FORGING TRAJECTORIES
      ctx.globalCompositeOperation = 'lighter';

      particles.forEach((p) => {
        p.angle += p.speed;

        let targetX, targetY;

        if (forgeProgress < 0.22) {
          // Phase 1: Floating Expansive Knowledge Field
          p.alpha = Math.min(1.0, p.alpha + 0.04);
          targetX = centerX + Math.cos(p.angle) * p.baseRadius;
          targetY = centerY + Math.sin(p.angle) * p.baseRadius * 0.65;
        } else if (forgeProgress < 0.50) {
          // Phase 2: Forging through Central Time Core
          const forgeSub = (forgeProgress - 0.22) / 0.28;
          if (forgeSub < 0.5) {
            // Stream into Core
            const inSub = forgeSub / 0.5;
            targetX = centerX + Math.cos(p.angle) * (p.baseRadius * (1 - inSub));
            targetY = centerY + Math.sin(p.angle) * (p.baseRadius * (1 - inSub) * 0.65);
          } else {
            // Burst outward to assigned Day Node
            const outSub = (forgeSub - 0.5) / 0.5;
            const assignedNode = dayNodePositions[p.assignedDay - 1];
            const nodeOffsetA = (p.id * 1.2);
            const nodeOffsetR = (p.id % 4 + 1.2) * (isMobile ? 22 : 36);
            const nodeX = assignedNode.x + Math.cos(nodeOffsetA) * nodeOffsetR;
            const nodeY = assignedNode.y + Math.sin(nodeOffsetA) * nodeOffsetR * 0.65;

            targetX = centerX + (nodeX - centerX) * outSub;
            targetY = centerY + (nodeY - centerY) * outSub;
          }
        } else {
          // Phase 3 & 4: Orbit around assigned Day Node
          const assignedNode = dayNodePositions[p.assignedDay - 1];
          const nodeOffsetA = p.angle * 1.5;
          const nodeOffsetR = (p.id % 4 + 1.2) * (isTimelinePhase ? 18 : 36);
          targetX = assignedNode.x + Math.cos(nodeOffsetA) * nodeOffsetR;
          targetY = assignedNode.y + Math.sin(nodeOffsetA) * nodeOffsetR * 0.65;
        }

        p.x += (targetX - p.x) * 0.16;
        p.y += (targetY - p.y) * 0.16;

        // Draw Topic Star Orb
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Topic Text Labels (Visible in Knowledge Field & Constellation stages)
        if (forgeProgress < 0.28 || (forgeProgress >= 0.52 && forgeProgress < 0.78)) {
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
          ctx.textAlign = 'center';
          ctx.fillText(p.name, p.x, p.y - p.size - 5);
        }
      });

      // D. RENDER LARGE DAY NODES & TOPIC CONSTELLATION LINES
      if (forgeProgress >= 0.40) {
        const nodeAlpha = Math.min(1.0, (forgeProgress - 0.40) / 0.15);

        // 1. Constellation interconnecting lines for each day
        dayNodePositions.forEach((nodeObj) => {
          const dayTopics = particles.filter(p => p.assignedDay === nodeObj.day);
          ctx.strokeStyle = `rgba(147, 197, 253, ${0.35 * nodeAlpha})`;
          ctx.lineWidth = 1.2;

          for (let i = 0; i < dayTopics.length; i++) {
            for (let j = i + 1; j < dayTopics.length; j++) {
              ctx.beginPath();
              ctx.moveTo(dayTopics[i].x, dayTopics[i].y);
              ctx.lineTo(dayTopics[j].x, dayTopics[j].y);
              ctx.stroke();
            }
          }

          // Line from day center to topic stars
          dayTopics.forEach(dt => {
            ctx.beginPath();
            ctx.moveTo(nodeObj.x, nodeObj.y);
            ctx.lineTo(dt.x, dt.y);
            ctx.stroke();
          });
        });

        // 2. Large Day Node Checkpoint Badges
        dayNodePositions.forEach((n) => {
          // Node Halo Glow
          const nGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 28);
          nGrad.addColorStop(0, `rgba(99, 102, 241, ${0.65 * nodeAlpha})`);
          nGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = nGrad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 28, 0, Math.PI * 2);
          ctx.fill();

          // Node Inner Circle Bullet
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(n.x, n.y, 6.5, 0, Math.PI * 2);
          ctx.fill();

          // Day Label Badge Text
          ctx.font = 'bold 12px font-mono, sans-serif';
          ctx.fillStyle = `rgba(241, 245, 249, ${nodeAlpha})`;
          ctx.textAlign = 'center';
          ctx.fillText(`DAY ${n.day}`, n.x, n.y + 24);
        });
      }

      // E. TIMELINE HORIZONTAL CONNECTORS & REVISION ARC (Phase 4 & 5)
      if (isTimelinePhase) {
        const lineAlpha = Math.min(1.0, (forgeProgress - 0.75) / 0.15);

        // Horizontal Timeline Connector Line
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.65 * lineAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < dayNodePositions.length; i++) {
          const np = dayNodePositions[i];
          if (i === 0) ctx.moveTo(np.x, np.y);
          else ctx.lineTo(np.x, np.y);
        }
        ctx.stroke();

        // Revision Curved Arc connecting Day 1..N-1 to Final Revision Day (Day N)
        if (dayNodePositions.length > 1) {
          const firstNode = dayNodePositions[0];
          const lastNode = dayNodePositions[dayNodePositions.length - 1];
          const midX = (firstNode.x + lastNode.x) / 2;
          const arcControlY = firstNode.y - (isMobile ? 90 : 140);

          ctx.save();
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.75 * lineAlpha})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([8, 5]);
          ctx.lineDashOffset = -time * 24;

          ctx.beginPath();
          ctx.moveTo(firstNode.x, firstNode.y);
          ctx.quadraticCurveTo(midX, arcControlY, lastNode.x, lastNode.y);
          ctx.stroke();
          ctx.restore();

          // Revision Arc Label
          ctx.font = 'bold 11px font-mono, sans-serif';
          ctx.fillStyle = `rgba(253, 230, 138, ${lineAlpha})`;
          ctx.textAlign = 'center';
          ctx.fillText('SYNTHESIS & REVISION ARC', midX, arcControlY - 10);
        }
      }

      ctx.restore();

      // Check if forge sequence has reached completion
      if (forgeProgress >= 1.0) {
        setTimeout(() => {
          setViewMode('mission-view');
          setSelectedDayNum(1);
          setLoading(false);
        }, 250);
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, [viewMode, daysInput]);

  // 2. Day Constellation Map Canvas Renderer
  useEffect(() => {
    if (viewMode !== 'mission-view' || !examMissionData) return;

    const canvas = constellationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let animId;

    const updateCanvasDimensions = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth * dpr;
        canvas.height = canvas.parentElement.clientHeight * dpr;
      }
    };
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);

    const activeDayData = examMissionData.days.find(d => d.day_number === selectedDayNum) || examMissionData.days[0];
    const dayNum = activeDayData?.day_number || selectedDayNum || 1;

    // Extract Day Topics & Activities
    const rawTopics = activeDayData?.topics || ['Core Principles'];
    const rawActivities = activeDayData?.activities || ['Active Recall', 'Practice Checkpoint'];

    // Construct a rich node network for this specific day
    const nodeList = [];

    // 1. Central Core Node for the Day
    nodeList.push({
      id: `core_${dayNum}`,
      type: 'core',
      title: `DAY ${dayNum}`,
      sub: activeDayData?.difficulty || 'Standard',
      size: 14,
      color: '#818cf8',
    });

    // 2. Primary Topic Nodes
    rawTopics.forEach((topicName, idx) => {
      nodeList.push({
        id: `topic_${idx}`,
        type: 'topic',
        title: topicName,
        sub: 'TOPIC',
        size: 8,
        color: '#93c5fd',
        topicIndex: idx,
      });
    });

    // 3. Activity / Milestone Nodes
    rawActivities.forEach((actName, idx) => {
      nodeList.push({
        id: `act_${idx}`,
        type: 'activity',
        title: actName,
        sub: 'ACTIVITY',
        size: 5.5,
        color: idx % 2 === 0 ? '#fde047' : '#34d399',
        actIndex: idx,
      });
    });

    // Seed geometry based on dayNum so Day 1, Day 2, Day 3 look completely different in topology!
    const dayRotation = (dayNum * 1.37) % (Math.PI * 2);
    const topicCount = rawTopics.length;
    const actCount = rawActivities.length;
    const outerNodes = nodeList.filter(n => n.type !== 'core');

    let hoveredNodeId = null;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;

      let found = null;
      for (const n of outerNodes) {
        if (n.computedX && n.computedY) {
          const dist = Math.hypot(mx - n.computedX, my - n.computedY);
          if (dist < (n.size * 3.0 + 12)) {
            found = n.id;
            break;
          }
        }
      }
      hoveredNodeId = found;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    let time = 0;

    // Energy pulses traveling along network lines
    const pulses = Array.from({ length: 8 }, (_, i) => ({
      progress: (i * 0.125) % 1,
      speed: 0.005 + (i % 3) * 0.003,
      edgeIndex: i,
    }));

    const render = () => {
      time += 0.016;
      const width = canvas.width;
      const height = canvas.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.35;

      // Calculate dynamic node positions with per-day mathematical geometry
      nodeList.forEach((n) => {
        if (n.type === 'core') {
          n.computedX = centerX;
          n.computedY = centerY;
          return;
        }

        let angle = 0;
        let radius = 0;

        if (n.type === 'topic') {
          const step = (Math.PI * 2) / Math.max(1, topicCount);
          angle = dayRotation + n.topicIndex * step;
          const radMult = 0.62 + 0.28 * Math.sin(dayNum * 1.5 + n.topicIndex * 2.2);
          radius = maxRadius * radMult;
        } else if (n.type === 'activity') {
          const step = (Math.PI * 2) / Math.max(1, actCount);
          const offsetAngle = (Math.PI / Math.max(2, topicCount));
          angle = dayRotation + offsetAngle + n.actIndex * step;
          const radMult = 0.86 + 0.14 * Math.cos(dayNum * 2.1 + n.actIndex * 1.8);
          radius = maxRadius * radMult;
        }

        // Add subtle 60fps floating organic drift
        const floatX = Math.cos(time * 0.8 + n.title.length + dayNum) * 3.5 * dpr;
        const floatY = Math.sin(time * 0.9 + n.title.length * 1.3) * 3.5 * dpr;

        n.computedX = centerX + Math.cos(angle) * radius + floatX;
        n.computedY = centerY + Math.sin(angle) * radius + floatY;
      });

      // 1. Construct Edge List
      const coreNode = nodeList.find(n => n.type === 'core');
      const edges = [];
      const topics = nodeList.filter(n => n.type === 'topic');
      const activities = nodeList.filter(n => n.type === 'activity');

      // Core -> Topics
      topics.forEach(t => {
        edges.push({ from: coreNode, to: t, style: 'solid', alpha: 0.45 });
      });

      // Topics -> Activities
      activities.forEach((a, aIdx) => {
        const parentTopic = topics[aIdx % topics.length] || coreNode;
        edges.push({ from: parentTopic, to: a, style: 'dashed', alpha: 0.35 });
      });

      // Inter-topic ring lines
      for (let i = 0; i < topics.length; i++) {
        for (let j = i + 1; j < topics.length; j++) {
          edges.push({ from: topics[i], to: topics[j], style: 'faint', alpha: 0.2 });
        }
      }

      // Draw Edges
      ctx.save();
      edges.forEach((edge) => {
        const isHighlighted = (hoveredNodeId && (edge.from.id === hoveredNodeId || edge.to.id === hoveredNodeId));
        ctx.beginPath();
        ctx.moveTo(edge.from.computedX, edge.from.computedY);
        ctx.lineTo(edge.to.computedX, edge.to.computedY);

        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(224, 231, 255, 0.9)';
          ctx.lineWidth = 2.2 * dpr;
        } else if (edge.style === 'solid') {
          ctx.strokeStyle = `rgba(147, 197, 253, ${edge.alpha})`;
          ctx.lineWidth = 1.3 * dpr;
        } else if (edge.style === 'dashed') {
          ctx.strokeStyle = `rgba(253, 230, 138, ${edge.alpha})`;
          ctx.lineWidth = 1.0 * dpr;
          ctx.setLineDash([4 * dpr, 4 * dpr]);
        } else {
          ctx.strokeStyle = `rgba(99, 102, 241, ${edge.alpha})`;
          ctx.lineWidth = 0.9 * dpr;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.restore();

      // 2. Draw Energy Pulses Along Network
      pulses.forEach(p => {
        p.progress += p.speed;
        if (p.progress >= 1.0) p.progress = 0;

        const targetEdge = edges[p.edgeIndex % edges.length];
        if (targetEdge && targetEdge.from.computedX && targetEdge.to.computedX) {
          const px = targetEdge.from.computedX + (targetEdge.to.computedX - targetEdge.from.computedX) * p.progress;
          const py = targetEdge.from.computedY + (targetEdge.to.computedY - targetEdge.from.computedY) * p.progress;

          const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 5 * dpr);
          pGrad.addColorStop(0, '#ffffff');
          pGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(px, py, 3.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 3. Render Nodes & Canvas Text Labels
      nodeList.forEach((n) => {
        const isHovered = hoveredNodeId === n.id;
        const scrX = n.computedX;
        const scrY = n.computedY;
        const size = (n.size + (isHovered ? 2.5 : 0)) * dpr;

        if (n.type === 'core') {
          // Central Core Orb
          const glowR = size * (2.6 + Math.sin(time * 2) * 0.3);
          const gGrad = ctx.createRadialGradient(scrX, scrY, 0, scrX, scrY, glowR);
          gGrad.addColorStop(0, 'rgba(129, 140, 248, 0.95)');
          gGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
          gGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = gGrad;
          ctx.beginPath();
          ctx.arc(scrX, scrY, glowR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(scrX, scrY, size * 0.55, 0, Math.PI * 2);
          ctx.fill();

          // Core Label
          ctx.font = `bold ${Math.round(10 * dpr)}px monospace`;
          ctx.fillStyle = '#f1f5f9';
          ctx.textAlign = 'center';
          ctx.fillText(n.title, scrX, scrY + size + 12 * dpr);
          return;
        }

        // Topic / Activity Halo
        const pulseVal = Math.sin(time * 3 + (n.topicIndex || n.actIndex || 0));
        const glowR = size * (2.2 + pulseVal * 0.35);
        const gGrad = ctx.createRadialGradient(scrX, scrY, 0, scrX, scrY, glowR);
        gGrad.addColorStop(0, n.color);
        gGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.25)');
        gGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(scrX, scrY, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Node Solid Bullet
        ctx.fillStyle = isHovered ? '#ffffff' : n.color;
        ctx.beginPath();
        ctx.arc(scrX, scrY, size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Canvas Text Label
        ctx.save();
        ctx.font = `${isHovered ? 'bold' : 'normal'} ${Math.round((n.type === 'topic' ? 10.5 : 9) * dpr)}px sans-serif`;
        ctx.fillStyle = isHovered ? '#ffffff' : (n.type === 'topic' ? 'rgba(226, 232, 240, 0.95)' : 'rgba(203, 213, 225, 0.75)');

        const dx = scrX - centerX;
        const dy = scrY - centerY;
        if (Math.abs(dx) > Math.abs(dy)) {
          ctx.textAlign = dx > 0 ? 'left' : 'right';
          const textX = scrX + (dx > 0 ? size + 6 * dpr : -(size + 6 * dpr));
          const textY = scrY + 3 * dpr;
          const maxChar = n.type === 'topic' ? 24 : 18;
          const displayTitle = n.title.length > maxChar ? n.title.slice(0, maxChar - 2) + '…' : n.title;
          ctx.fillText(displayTitle, textX, textY);
        } else {
          ctx.textAlign = 'center';
          const textY = scrY + (dy > 0 ? size + 12 * dpr : -(size + 6 * dpr));
          const maxChar = n.type === 'topic' ? 24 : 18;
          const displayTitle = n.title.length > maxChar ? n.title.slice(0, maxChar - 2) + '…' : n.title;
          ctx.fillText(displayTitle, scrX, textY);
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasDimensions);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [viewMode, selectedDayNum, examMissionData]);

  // Handle Mission Build Trigger
  const handleBuildMission = async () => {
    if (!fileId) return;
    setLoading(true);
    setErrorMessage('');
    setViewMode('knowledge-forge');

    try {
      const data = await generateExamMission(fileId, daysInput, examDate);
      setExamMissionData(data);
      if (fileId) {
        localStorage.setItem(`exam_mission_${fileId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to generate mission plan.');
      setViewMode('entry');
      setLoading(false);
    }
  };

  // Launch Checkpoint Modal
  const handleStartCheckpoint = (dayData) => {
    let questions = dayData?.checkpoint_questions;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      const topics = (dayData?.topics && dayData.topics.length > 0) ? dayData.topics : ['Core Concepts'];
      questions = topics.map((t, idx) => ({
        id: `q_${idx + 1}`,
        topic: t,
        question: `Which of the following statements best describes ${t}?`,
        options: [
          { id: 'a', text: `${t} forms a fundamental principles component of the study material.` },
          { id: 'b', text: `${t} is an unverified external concept unrelated to this subject.` },
          { id: 'c', text: `${t} is only utilized during administrative document processing.` },
          { id: 'd', text: `${t} represents obsolete metadata from legacy formatting.` }
        ],
        correct_option_id: 'a',
        explanation: `${t} is a key topic in this module.`
      }));
    }

    setActiveCheckpointDay({
      ...dayData,
      checkpoint_questions: questions
    });
    setUserAnswers({});
    setCheckpointResult(null);
    setViewMode('checkpoint');
  };

  // Submit Checkpoint Quiz
  const handleSubmitCheckpoint = async () => {
    if (!activeCheckpointDay) return;
    const questions = activeCheckpointDay.checkpoint_questions || [];
    let correct = 0;

    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct_option_id) {
        correct++;
      }
    });

    const total = questions.length || 1;
    const percentage = Math.round((correct / total) * 100);

    const mastered = [];
    const needsAttention = [];

    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct_option_id) {
        mastered.push(q.topic);
      } else {
        needsAttention.push(q.topic);
      }
    });

    const result = {
      score: percentage,
      mastered: Array.from(new Set(mastered)),
      needsAttention: Array.from(new Set(needsAttention)),
    };

    setCheckpointResult(result);

    // Update mission day completion & score
    const updatedDays = examMissionData.days.map((d) => {
      if (d.day_number === activeCheckpointDay.day_number) {
        return { ...d, is_completed: true, score: percentage };
      }
      return d;
    });

    const updatedMission = { ...examMissionData, days: updatedDays };
    setExamMissionData(updatedMission);
    if (fileId) {
      localStorage.setItem(`exam_mission_${fileId}`, JSON.stringify(updatedMission));
    }

    // Trigger Adaptive Plan Rebalancing if weak concept detected (<65%)
    if (percentage < 65 && needsAttention.length > 0) {
      const weak = needsAttention[0];
      setTimeout(async () => {
        setAdaptationMessage(`"${weak}" needs reinforcement.`);
        setViewMode('adapting');

        try {
          const adaptRes = await adaptExamMission(fileId, updatedDays, weak, activeCheckpointDay.day_number);
          const rebalancedMission = { ...updatedMission, days: adaptRes.days };
          setExamMissionData(rebalancedMission);
          if (fileId) {
            localStorage.setItem(`exam_mission_${fileId}`, JSON.stringify(rebalancedMission));
          }

          setTimeout(() => {
            setViewMode('mission-view');
          }, 1200);
        } catch (e) {
          setTimeout(() => setViewMode('mission-view'), 1000);
        }
      }, 700);
    }
  };

  // Start Day Integration -> Launches existing EASY_LEARN study views
  const handleStartDay = () => {
    setActiveView('topics');
  };

  const activeDayData = examMissionData?.days?.find((d) => d.day_number === selectedDayNum) || examMissionData?.days?.[0];

  return (
    <div className="w-full space-y-8 relative">

      {/* 1. ENTRY STATE: USER INPUT */}
      {viewMode === 'entry' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-8 text-center pt-4"
        >
          {/* Header Card */}
          <div className="glass-card p-8 sm:p-12 space-y-8 border-indigo-500/20 bg-slate-950/80">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 mx-auto flex items-center justify-center text-indigo-400">
              <Target className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit']">
                WHEN IS YOUR EXAM?
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Tell EASY_LEARN how much time you have. We'll analyze your document and map your personalized day-by-day path to exam mastery.
              </p>
            </div>

            {/* Input Options */}
            <div className="space-y-6 pt-2">
              {/* Days Counter Input */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-baseline justify-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={daysInput}
                    onChange={(e) => setDaysInput(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    className="w-28 py-3 bg-slate-900 border-2 border-indigo-500/50 rounded-2xl text-center text-3xl font-extrabold text-white font-mono focus:border-indigo-400 focus:outline-none shadow-xl"
                  />
                  <span className="text-xl font-bold font-mono text-slate-300">DAYS REMAINING</span>
                </div>

                {/* Quick Option Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {[3, 5, 7, 10, 15, 30].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setDaysInput(preset);
                        setExamDate('');
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
                        daysInput === preset && !examDate
                          ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-200 shadow-md font-bold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      {preset} DAYS
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Exam Date Input */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="h-px w-12 bg-slate-800" />
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">OR SELECT EXAM DATE</span>
                <span className="h-px w-12 bg-slate-800" />
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-indigo-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="date"
                    value={examDate}
                    onChange={handleDateChange}
                    className="pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* CTA Button Area */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <MagneticButton onClick={handleBuildMission} disabled={loading} strength={0.15}>
                <div className="px-8 py-4 rounded-xl bg-slate-100 hover:bg-white text-slate-950 text-sm font-bold shadow-xl flex items-center gap-2.5 transition-all">
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>BUILD MY EXAM PULSE</span>
                </div>
              </MagneticButton>

              {examMissionData && (
                <button
                  onClick={() => setViewMode('mission-view')}
                  className="px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>VIEW SAVED PLAN ({examMissionData.days?.length || daysInput} DAYS)</span>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. KNOWLEDGE FORGE SIGNATURE CINEMATIC ANIMATION STATE */}
      {viewMode === 'knowledge-forge' && (
        <div className="fixed inset-0 z-50 bg-[#070a11] text-white overflow-hidden select-none">
          <canvas ref={timeCollapseCanvasRef} className="w-full h-full absolute inset-0 pointer-events-none z-0" />

          {/* Central Time Core Engine Overlay Badge - PERFECTLY CENTERED AT 50% 50% */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60 rounded-full bg-slate-950/85 border-2 border-indigo-500/70 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.35)] backdrop-blur-md"
            >
              <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-mono text-indigo-300 tracking-tight">{daysInput}</span>
              <span className="text-[10px] sm:text-xs font-mono tracking-widest text-slate-300 font-bold uppercase mt-1">DAYS</span>
            </motion.div>
          </div>

          {/* Subtitle status text positioned cleanly at bottom so it doesn't displace the center core */}
          <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-10 text-center space-y-2 max-w-lg px-4 pointer-events-none">
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              KNOWLEDGE FORGE ARCHITECT • INTELLIGENT ALLOCATION
            </span>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white font-['Outfit']">
              FORGING YOUR EXAM PULSE
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Transforming document concepts into a day-by-day study constellation...
            </p>
          </div>
        </div>
      )}

      {/* 3. MISSION TIMELINE & CONSTELLATION VIEW */}
      {viewMode === 'mission-view' && examMissionData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {/* Header Summary Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 bg-slate-950/80 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">
                  EXAM PULSE ACTIVE • {examMissionData.subject}
                </span>
                <h2 className="text-2xl font-extrabold text-white font-['Outfit'] mt-0.5">
                  YOUR EXAM PULSE
                </h2>
              </div>

              {/* Countdown & Metadata Metrics + Change Days Button */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <button
                  onClick={() => setViewMode('entry')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>CHANGE DAYS / EXAM DATE</span>
                </button>

                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-300 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>EXAM IN {daysInput < 10 ? `0${daysInput}` : daysInput} DAYS</span>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>{examMissionData.total_topics} Topics</span>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Est. {examMissionData.total_estimated_time} Total</span>
                </div>
              </div>
            </div>

            {/* Signature Tagline */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>"YOUR TIME IS LIMITED. YOUR LEARNING DOESN'T HAVE TO BE."</span>
              <span className="text-indigo-400 font-semibold">PULSE READY</span>
            </div>
          </div>

          {/* Exam Eve Mode Banner (if 1 day remaining) */}
          {examMissionData.is_exam_eve && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">EXAM EVE MODE ACTIVATED:</span> High-priority core concepts, weak area reviews, and rapid recall questions enabled for your final 24 hours.
              </div>
            </div>
          )}

          {/* Interactive Timeline Navigation Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[600px] px-4">
              {examMissionData.days.map((d, idx) => {
                const isSelected = selectedDayNum === d.day_number;
                const isDone = d.is_completed;

                return (
                  <React.Fragment key={d.day_number}>
                    <button
                      onClick={() => setSelectedDayNum(d.day_number)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-indigo-600/30 border border-indigo-400 text-white shadow-lg'
                          : 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                        <span>DAY {d.day_number}</span>
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                        {d.title.split('&')[0]}
                      </span>
                    </button>

                    {idx < examMissionData.days.length - 1 && (
                      <div className="h-0.5 flex-1 bg-slate-800 mx-2" />
                    )}
                  </React.Fragment>
                );
              })}

              <div className="h-0.5 w-8 bg-slate-800 mx-2" />

              {/* Exam Node */}
              <div className="flex flex-col items-center gap-1 p-2 text-indigo-400 font-mono text-xs font-bold">
                <Trophy className="w-5 h-5" />
                <span>EXAM</span>
              </div>
            </div>
          </div>

          {/* Day Constellation & Side Details Grid */}
          {activeDayData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Day Constellation Chart Canvas */}
              <div className="lg:col-span-6 glass-card p-6 border border-slate-800/80 bg-slate-950/80 h-[380px] relative flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>DAY {activeDayData.day_number} CONSTELLATION CHART</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {activeDayData.difficulty}
                  </span>
                </div>

                <canvas ref={constellationCanvasRef} className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer" />

                <div className="relative z-10 text-xs font-mono text-slate-500">
                  Click nodes to explore topic dependencies
                </div>
              </div>

              {/* Right Column: Day Pulse Details */}
              <div className="lg:col-span-6 glass-card p-6 sm:p-8 space-y-6 border border-slate-800/80 bg-slate-950/80">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                    DAY {activeDayData.day_number} PULSE PLAN
                  </span>
                  <h3 className="text-2xl font-extrabold text-white font-['Outfit']">
                    {activeDayData.title}
                  </h3>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="font-mono text-[10px] font-bold uppercase text-slate-500">PULSE GOAL</span>
                  <p className="leading-relaxed">{activeDayData.goal}</p>
                </div>

                {/* Topics Covered */}
                <div className="space-y-2">
                  <span className="font-mono text-xs font-bold uppercase text-slate-400">TOPICS TO MASTER</span>
                  <div className="flex flex-wrap gap-2">
                    {activeDayData.topics.map((t, idx) => (
                      <span key={idx} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-200">
                        • {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Study Activities */}
                <div className="space-y-2">
                  <span className="font-mono text-xs font-bold uppercase text-slate-400">STUDY ACTIVITIES</span>
                  <div className="grid grid-cols-3 gap-2">
                    {activeDayData.activities.map((act, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center text-[11px] font-medium text-slate-300">
                        {act}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions: START DAY & CHECKPOINT */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleStartDay}
                    className="flex-1 py-3 px-5 rounded-xl bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>START DAY {activeDayData.day_number}</span>
                  </button>

                  <button
                    onClick={() => handleStartCheckpoint(activeDayData)}
                    className="py-3 px-5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all backdrop-blur-sm group"
                  >
                    <Award className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    <span>PROVE YOUR UNDERSTANDING</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 4. CHECKPOINT QUIZ MODAL ("PROVE YOUR UNDERSTANDING") */}
      {viewMode === 'checkpoint' && activeCheckpointDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 max-w-xl w-full border border-indigo-500/30 bg-slate-950 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                  DAY {activeCheckpointDay.day_number} CHECKPOINT
                </span>
                <h3 className="text-xl font-bold text-white font-['Outfit']">
                  PROVE YOUR UNDERSTANDING
                </h3>
              </div>
              <button
                onClick={() => setViewMode('mission-view')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!checkpointResult ? (
              <div className="space-y-6">
                {(activeCheckpointDay.checkpoint_questions || []).map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <span className="text-xs font-mono font-bold text-indigo-300">QUESTION {idx + 1} • {q.topic}</span>
                    <p className="text-xs font-medium text-slate-100 leading-relaxed">{q.question}</p>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setUserAnswers({ ...userAnswers, [q.id]: opt.id })}
                          className={`w-full text-left p-3 rounded-lg text-xs transition-all border ${
                            userAnswers[q.id] === opt.id
                              ? 'bg-indigo-600/30 border-indigo-400 text-white font-semibold'
                              : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <span className="font-mono text-indigo-400 mr-2">{opt.id.toUpperCase()}.</span>
                          <span>{opt.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleSubmitCheckpoint}
                  disabled={Object.keys(userAnswers).length < (activeCheckpointDay.checkpoint_questions?.length || 1)}
                  className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold disabled:opacity-50 transition-all"
                >
                  SUBMIT CHECKPOINT
                </button>
              </div>
            ) : (
              /* Checkpoint Quiz Result View */
              <div className="space-y-6 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-indigo-500 mx-auto flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold font-mono text-indigo-300">{checkpointResult.score}%</span>
                  <span className="text-[9px] font-mono text-slate-400">SCORE</span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-white font-['Outfit']">
                    {checkpointResult.score >= 70 ? 'Checkpoint Mastered!' : 'Checkpoint Needs Reinforcement'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {checkpointResult.score >= 70
                      ? 'Great job! You have demonstrated strong understanding of today\'s concepts.'
                      : 'EASY_LEARN has identified topics that require extra focus.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">MASTERED</span>
                    <ul className="text-xs text-emerald-200 space-y-0.5">
                      {checkpointResult.mastered.map((m, i) => (
                        <li key={i}>✓ {m}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">NEEDS ATTENTION</span>
                    <ul className="text-xs text-amber-200 space-y-0.5">
                      {checkpointResult.needsAttention.length > 0 ? (
                        checkpointResult.needsAttention.map((n, i) => (
                          <li key={i}>⚠ {n}</li>
                        ))
                      ) : (
                        <li>None</li>
                      )}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setViewMode('mission-view')}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-white text-slate-950 text-xs font-bold"
                >
                  RETURN TO EXAM PULSE TIMELINE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PLAN ADAPTATION ANIMATION OVERLAY ("YOUR PLAN ADAPTED") */}
      {viewMode === 'adapting' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070a11]/95 text-white backdrop-blur-md">
          <div className="text-center space-y-6 max-w-md px-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 mx-auto flex items-center justify-center text-amber-300 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                ADAPTIVE REBALANCING PROTOCOL
              </span>
              <h3 className="text-2xl font-extrabold text-white font-['Outfit']">
                YOUR PLAN ADAPTED
              </h3>
              <p className="text-xs text-amber-200/90 font-mono">
                {adaptationMessage || 'Reinforcement topics added based on your checkpoint results.'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamMissionView;
