import React, { useEffect, useRef } from 'react';

export const CustomCursor = () => {
  const containerRef = useRef(null);
  const ringRef = useRef(null);
  const dotRef = useRef(null);

  useEffect(() => {
    // Disable custom cursor on touch devices or reduced motion
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouchDevice || prefersReducedMotion) {
      return;
    }

    document.body.classList.add('custom-cursor-active');

    let mouseX = -100;
    let mouseY = -100;
    let currentX = -100;
    let currentY = -100;
    let isVisible = false;
    let isHovered = false;
    let isClicked = false;
    let animationFrameId;

    const updateClasses = () => {
      const ring = ringRef.current;
      const dot = dotRef.current;
      if (!ring || !dot) return;

      if (isHovered) {
        ring.className = 'w-9 h-9 bg-indigo-500/10 border-indigo-400/50 scale-110 shadow-sm rounded-full border flex items-center justify-center transition-all duration-150 ease-out';
        dot.className = 'w-1.5 h-1.5 rounded-full bg-indigo-200 transition-transform duration-150 scale-125';
      } else if (isClicked) {
        ring.className = 'w-5 h-5 bg-indigo-400/20 border-indigo-400/80 scale-90 rounded-full border flex items-center justify-center transition-all duration-150 ease-out';
        dot.className = 'w-1.5 h-1.5 rounded-full bg-indigo-200 transition-transform duration-150 scale-75';
      } else {
        ring.className = 'w-6 h-6 bg-transparent border-slate-700/50 scale-100 rounded-full border flex items-center justify-center transition-all duration-150 ease-out';
        dot.className = 'w-1.5 h-1.5 rounded-full bg-indigo-200 transition-transform duration-150 scale-100';
      }
    };

    const onMouseMove = (e) => {
      if (mouseX === -100) {
        currentX = e.clientX;
        currentY = e.clientY;
      }
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        if (containerRef.current) {
          containerRef.current.style.opacity = '1';
        }
      }
    };

    const onMouseOver = (e) => {
      const target = e.target;
      if (!target) return;
      const interactive = !!target.closest('button, a, input, textarea, [role="button"], .interactive-target, .glass-panel-hover');
      if (interactive !== isHovered) {
        isHovered = interactive;
        updateClasses();
      }
    };

    const onMouseDown = () => {
      isClicked = true;
      updateClasses();
    };

    const onMouseUp = () => {
      isClicked = false;
      updateClasses();
    };

    const onMouseLeave = () => {
      isVisible = false;
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
      }
    };

    const onMouseEnter = () => {
      isVisible = true;
      if (containerRef.current) {
        containerRef.current.style.opacity = '1';
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });
    document.addEventListener('mouseenter', onMouseEnter, { passive: true });

    const render = () => {
      // Instant 1:1 hardware-matched cursor tracking without lag (0.96 lerp)
      currentX += (mouseX - currentX) * 0.96;
      currentY += (mouseY - currentY) * 0.96;

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:flex items-center justify-center transition-opacity duration-150"
      style={{ willChange: 'transform', opacity: 0 }}
    >
      <div
        ref={ringRef}
        className="w-6 h-6 bg-transparent border-slate-700/50 scale-100 rounded-full border flex items-center justify-center transition-all duration-150 ease-out"
      >
        <div
          ref={dotRef}
          className="w-1.5 h-1.5 rounded-full bg-indigo-200 transition-transform duration-150 scale-100"
        />
      </div>
    </div>
  );
};

export default CustomCursor;
