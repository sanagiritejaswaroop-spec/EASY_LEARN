import React, { useEffect, useRef } from 'react';

export const CosmicBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use alpha: false for maximum GPU canvas performance
    const ctx = canvas.getContext('2d', { alpha: false });
    let animationFrameId;

    // Device Pixel Ratio capped at 2 for high DPI screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);

    // Refs for input tracking (ZERO React state updates in render loop)
    const targetMouseX = { current: width / 2 };
    const targetMouseY = { current: height / 2 };
    const mouseX = { current: width / 2 };
    const mouseY = { current: height / 2 };

    const targetScrollY = { current: window.scrollY || 0 };
    const currentScrollY = { current: window.scrollY || 0 };

    let targetRotationVelocity = 0;
    let rotationVelocity = 0;
    let rotation = 0;

    // 3D Camera Zoom State (persistent timeline: 1.00 at top of page -> 1.18 at bottom of page)
    let currentZoom = 1.0;

    // Event handlers do NOTHING except update target refs (instant input capture)
    const handleMouseMove = (e) => {
      targetMouseX.current = e.clientX * dpr;
      targetMouseY.current = e.clientY * dpr;
    };

    const handleScroll = () => {
      targetScrollY.current = window.scrollY || 0;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
      initGalaxy();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024;
    const totalParticles = isMobile ? 1500 : isTablet ? 2500 : 4000;

    let particles = [];
    let backgroundStars = [];

    const randomGaussian = (mean = 0, stdev = 1) => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.00001)) * Math.cos(2.0 * Math.PI * u2);
      return z0 * stdev + mean;
    };

    const initGalaxy = () => {
      particles = [];
      backgroundStars = [];

      // 1. Layer 1: Distant Background Stars
      const bgStarCount = isMobile ? 40 : 100;
      for (let i = 0; i < bgStarCount; i++) {
        backgroundStars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: (Math.random() * 0.6 + 0.3) * dpr,
          alpha: Math.random() * 0.22 + 0.04,
          twinkleSpeed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1)
        });
      }

      // 2. Layer 2 & 3: Procedural 3D Logarithmic Spiral Galaxy (r = a * exp(b * theta))
      const armCount = 4;
      const coreParticleCount = Math.floor(totalParticles * 0.22);
      const armParticleCount = totalParticles - coreParticleCount;

      const maxGalaxyRadius = Math.min(width, height) * (isMobile ? 0.65 : 0.76);
      const innerCoreRadius = maxGalaxyRadius * 0.14;

      const getRandomColor = () => {
        const rand = Math.random();
        if (rand < 0.90) {
          // ~90% soft cool white
          const v = Math.floor(Math.random() * 20 + 235);
          return { r: v, g: Math.min(255, v + 4), b: 255 };
        } else if (rand < 0.97) {
          // ~7% subtle icy blue
          return { r: 147, g: 197, b: 253 };
        } else {
          // ~3% warm white / gold highlight
          return { r: 253, g: 230, b: 138 };
        }
      };

      // A. Compact Luminous Core Particles
      for (let i = 0; i < coreParticleCount; i++) {
        const dist = Math.pow(Math.random(), 2.0) * innerCoreRadius;
        const angle = Math.random() * Math.PI * 2;
        const z = randomGaussian(0, innerCoreRadius * 0.18);
        const speed = (0.0012 + (1 - dist / innerCoreRadius) * 0.0016) * (Math.random() > 0.5 ? 1 : -1);

        const brightnessTier = Math.random();
        let baseAlpha, baseSize;
        if (brightnessTier < 0.70) {
          baseAlpha = Math.random() * 0.20 + 0.10;
          baseSize = Math.random() * 0.4 + 0.4;
        } else if (brightnessTier < 0.94) {
          baseAlpha = Math.random() * 0.35 + 0.25;
          baseSize = Math.random() * 0.4 + 0.6;
        } else {
          baseAlpha = Math.random() * 0.35 + 0.55;
          baseSize = Math.random() * 0.5 + 0.9;
        }

        const col = getRandomColor();
        const layerDepth = Math.random() * 0.4 + 0.8;
        const interactRadius = 140 * layerDepth * dpr;

        particles.push({
          isCore: true,
          dist,
          angle,
          z,
          baseSize: baseSize * dpr,
          baseAlpha,
          color: col,
          colorRgb: `${col.r}, ${col.g}, ${col.b}`,
          speed: Math.abs(speed),
          twinklePhase: Math.random() * Math.PI * 2,
          offsetX: 0,
          offsetY: 0,
          layerDepth,
          interactRadius,
          interactRadiusSq: interactRadius * interactRadius
        });
      }

      // B. 4-Arm Logarithmic Spiral Particles
      for (let i = 0; i < armParticleCount; i++) {
        const armIndex = i % armCount;
        const armAngleOffset = (armIndex * 2 * Math.PI) / armCount;

        const normDist = Math.pow(Math.random(), 0.85);
        const dist = innerCoreRadius + normDist * (maxGalaxyRadius - innerCoreRadius);
        const spiralRot = Math.log(dist / innerCoreRadius + 1) * 2.8;

        const scatterR = randomGaussian(0, 12 + normDist * 25);
        const scatterTheta = randomGaussian(0, 0.08 + normDist * 0.14);

        const angle = armAngleOffset + spiralRot + scatterTheta;
        const finalDist = Math.max(innerCoreRadius * 0.4, dist + scatterR);

        const z = randomGaussian(0, 24 * (1 - normDist * 0.4));
        const speed = 0.00045 / Math.pow(finalDist / innerCoreRadius, 0.42);

        const brightnessTier = Math.random();
        let baseAlpha, baseSize;
        if (brightnessTier < 0.75) {
          baseAlpha = (Math.random() * 0.16 + 0.06) * (1 - normDist * 0.4);
          baseSize = Math.random() * 0.4 + 0.4;
        } else if (brightnessTier < 0.95) {
          baseAlpha = (Math.random() * 0.30 + 0.20) * (1 - normDist * 0.35);
          baseSize = Math.random() * 0.4 + 0.6;
        } else {
          baseAlpha = (Math.random() * 0.3 + 0.50) * (1 - normDist * 0.25);
          baseSize = Math.random() * 0.5 + 0.8;
        }

        const isForeground = i % 10 === 0;
        const col = getRandomColor();
        const layerDepth = isForeground ? 1.4 : Math.random() * 0.4 + 0.7;
        const interactRadius = 140 * layerDepth * dpr;

        particles.push({
          isCore: false,
          dist: finalDist,
          angle,
          z,
          baseSize: (isForeground ? baseSize * 1.3 : baseSize) * dpr,
          baseAlpha: isForeground ? baseAlpha * 1.2 : baseAlpha,
          color: col,
          colorRgb: `${col.r}, ${col.g}, ${col.b}`,
          speed,
          normDist,
          twinklePhase: Math.random() * Math.PI * 2,
          offsetX: 0,
          offsetY: 0,
          layerDepth,
          interactRadius,
          interactRadiusSq: interactRadius * interactRadius
        });
      }
    };

    initGalaxy();

    let lastTime = performance.now();

    let isTabActive = true;
    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Single Primary requestAnimationFrame Loop
    const render = (time) => {
      if (!isTabActive) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Delta time normalization
      const dt = Math.min(32, time - lastTime);
      lastTime = time;
      const timeFactor = dt / 16.667;

      // 1. Mouse Lerp (0.15 factor for smooth cursor tracking)
      mouseX.current += (targetMouseX.current - mouseX.current) * 0.15 * timeFactor;
      mouseY.current += (targetMouseY.current - mouseY.current) * 0.15 * timeFactor;

      // 2. Smooth Scroll Lerp & Scroll Progress Calculation
      currentScrollY.current += (targetScrollY.current - currentScrollY.current) * 0.14 * timeFactor;
      
      const maxScrollHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const normScroll = Math.min(1.0, Math.max(0, currentScrollY.current / maxScrollHeight));

      // Persistent Camera Timeline Target:
      // normScroll = 0.0 (top of page) -> targetZoom = 1.00
      // normScroll = 1.0 (bottom of page) -> targetZoom = 1.18
      // When scrolling stops, targetZoom HOLDS its exact value with ZERO auto-reset decay!
      const targetZoom = 1.0 + normScroll * 0.18;
      currentZoom += (targetZoom - currentZoom) * 0.08 * timeFactor;

      // Dynamic Inclination (5-8% flattening: 30° at top -> 27.5° at bottom of page)
      const currentIncDegrees = 30 - normScroll * 2.5; // 30° -> 27.5° (~8% flattening)
      const currentInc = currentIncDegrees * (Math.PI / 180);
      const cosInc = Math.cos(currentInc);
      const sinInc = Math.sin(currentInc);

      // Subtle rotational impulse mapped to scroll velocity
      const scrollVel = targetScrollY.current - currentScrollY.current;
      const MAX_SCROLL_ROTATION_SPEED = 0.0012;
      const rawImpulse = scrollVel * 0.00003;
      const clampedImpulse = Math.max(-MAX_SCROLL_ROTATION_SPEED, Math.min(MAX_SCROLL_ROTATION_SPEED, rawImpulse));

      targetRotationVelocity = clampedImpulse;
      targetRotationVelocity *= 0.90;
      rotationVelocity += (targetRotationVelocity - rotationVelocity) * 0.14 * timeFactor;

      // Continuous autonomous astronomical rotation (~0.00095 rad/frame) + subtle rotation velocity
      const baseRotationSpeed = 0.00095;
      rotation += (baseRotationSpeed + rotationVelocity) * timeFactor;

      const scrollYOffset = normScroll * height * 0.08;

      // Subtle Parallax (max 10px shift for galaxy)
      const parallaxX = (mouseX.current - width / 2) * 0.006;
      const parallaxY = (mouseY.current - height / 2) * 0.006;

      // Galaxy Center Target: X ≈ 68%, Y ≈ 48% (anchored camera vortex focus)
      const centerX = width * (isMobile ? 0.5 : 0.68) + parallaxX;
      const centerY = height * (isMobile ? 0.44 : 0.48) + parallaxY - scrollYOffset * 0.25;

      // Clear dark space fill
      ctx.fillStyle = '#02050a';
      ctx.fillRect(0, 0, width, height);

      // 3. Layer 1: Distant Background Stars
      for (let i = 0; i < backgroundStars.length; i++) {
        const star = backgroundStars[i];
        star.alpha += star.twinkleSpeed * timeFactor;
        if (star.alpha <= 0.03 || star.alpha >= 0.25) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        const bgStarY = (star.y - normScroll * height * 0.06 + height) % height;

        ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0.03, Math.min(0.25, star.alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x, bgStarY, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Central Core Luminous Soft Glow Bloom (scales persistently with currentZoom)
      const coreGlowRadius = (isMobile ? 90 : 160) * currentZoom * dpr;
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreGlowRadius);
      coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.48)');
      coreGlow.addColorStop(0.18, 'rgba(240, 246, 255, 0.24)');
      coreGlow.addColorStop(0.45, 'rgba(147, 197, 253, 0.06)');
      coreGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 5. 3D Logarithmic Spiral Galaxy Particles Render
      ctx.globalCompositeOperation = 'lighter';

      const leftSafeLimit = width * (isMobile ? 0.38 : 0.42);
      const focalLength = 700;

      // 3D Camera Z Translation (moves camera forward into 3D particle space as zoom increases)
      const cameraZOffset = (currentZoom - 1.0) * 260;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed * timeFactor;

        p.twinklePhase += 0.02 * timeFactor;
        const twinkleFactor = 1 + Math.sin(p.twinklePhase) * 0.08;

        // Fast decay of cursor displacement
        p.offsetX *= 0.88;
        p.offsetY *= 0.88;

        const currentAngle = p.angle + rotation;
        const r = p.dist;

        // 3D coordinates on inclined galaxy plane
        const x3d = r * Math.cos(currentAngle);
        const y3d = r * Math.sin(currentAngle);
        const z3d = p.z;

        // 3D Rotation with dynamic inclination angle
        const projectedY = y3d * cosInc - z3d * sinInc;
        const projectedZ = y3d * sinInc + z3d * cosInc;

        // 3D Perspective Projection with Persistent Camera Timeline Z Translation:
        const effectiveZ = Math.max(40, focalLength + projectedZ - cameraZOffset);
        const perspectiveScale = (focalLength / effectiveZ) * currentZoom * (0.85 + p.layerDepth * 0.15);
        const layerScrollY = normScroll * height * 0.05 * p.layerDepth;

        let screenX = centerX + x3d * perspectiveScale + p.offsetX;
        let screenY = centerY + (projectedY - layerScrollY) * perspectiveScale + p.offsetY;

        if (screenX < -30 || screenX > width + 30 || screenY < -30 || screenY > height + 30) {
          continue;
        }

        // Fast Squared Distance Interaction Check using pre-calculated radius
        const dx = mouseX.current - screenX;
        const dy = mouseY.current - screenY;
        const distSq = dx * dx + dy * dy;

        if (distSq < p.interactRadiusSq) {
          const distToMouse = Math.sqrt(distSq);
          const force = (1 - distToMouse / p.interactRadius) * 2.2 * p.layerDepth;
          p.offsetX -= (dx / distToMouse) * force;
          p.offsetY -= (dy / distToMouse) * force;
        }

        // Left Content-Safe Zone Protection (Left 42% screen protected)
        let safeZoneFactor = 1.0;
        if (screenX < leftSafeLimit) {
          const normLeft = Math.max(0, screenX / leftSafeLimit);
          safeZoneFactor = Math.pow(normLeft, 2.0) * 0.85 + 0.15;
        }

        const particleSize = Math.max(0.35 * dpr, p.baseSize * perspectiveScale);
        const alpha = Math.max(
          0.02,
          Math.min(0.90, p.baseAlpha * twinkleFactor * perspectiveScale * safeZoneFactor)
        );

        ctx.fillStyle = `rgba(${p.colorRgb}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.98 }}
    />
  );
};

export default CosmicBackground;
