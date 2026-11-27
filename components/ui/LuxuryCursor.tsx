"use client";

import React, { useState, useEffect, useRef } from "react";

export function LuxuryCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pointerQuery = window.matchMedia("(pointer: fine) and (hover: hover)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePolicy = () => {
      const fine = pointerQuery.matches && !motionQuery.matches;
      setEnabled(fine);
    };
    updatePolicy();

    pointerQuery.addEventListener?.("change", updatePolicy);
    motionQuery.addEventListener?.("change", updatePolicy);

    return () => {
      pointerQuery.removeEventListener?.("change", updatePolicy);
      motionQuery.removeEventListener?.("change", updatePolicy);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const outerEl = outerRef.current;
    const innerEl = innerRef.current;
    if (!outerEl || !innerEl) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let visible = false;
    let hoverMode: "default" | "interactive" | "text" = "default";
    let pressed = false;
    let rafId = 0;

    const interactiveSelector =
      'a, button, [role="button"], summary, select, label[for], [data-cursor="interactive"], .cursor-pointer';
    const textSelector = 'input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="search"], textarea';

    const updateStyles = () => {
      const op = visible ? "1" : "0";
      outerEl.style.opacity = op;
      innerEl.style.opacity = hoverMode === "text" ? "0.35" : op;

      const scale = pressed ? 0.85 : hoverMode === "interactive" ? 1.55 : hoverMode === "text" ? 0.72 : 1;
      const borderColor =
        hoverMode === "interactive"
          ? "rgba(212, 175, 55, 0.75)"
          : "rgba(96, 165, 250, 0.48)";
      const bgColor =
        hoverMode === "interactive"
          ? "rgba(212, 175, 55, 0.08)"
          : "rgba(59, 130, 246, 0.04)";
      const shadow =
        hoverMode === "interactive"
          ? "0 0 24px rgba(212, 175, 55, 0.25)"
          : "0 0 18px rgba(59, 130, 246, 0.16)";

      outerEl.style.borderColor = borderColor;
      outerEl.style.backgroundColor = bgColor;
      outerEl.style.boxShadow = shadow;
      outerEl.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
      innerEl.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${pressed ? 0.75 : hoverMode === "interactive" ? 0.65 : 1})`;
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.2;
      ringY += (mouseY - ringY) * 0.2;
      updateStyles();
      rafId = window.requestAnimationFrame(tick);
    };

    const handleMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        ringX = mouseX;
        ringY = mouseY;
        visible = true;
      }
      const target = e.target as HTMLElement | null;
      if (target && target.closest(textSelector)) {
        hoverMode = "text";
      } else if (target && target.closest(interactiveSelector)) {
        hoverMode = "interactive";
      } else {
        hoverMode = "default";
      }
    };

    const handleLeave = () => {
      visible = false;
      updateStyles();
    };

    const handleDown = () => {
      pressed = true;
    };

    const handleUp = () => {
      pressed = false;
    };

    rafId = window.requestAnimationFrame(tick);
    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    window.addEventListener("mousedown", handleDown, { passive: true });
    window.addEventListener("mouseup", handleUp, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <div
        ref={outerRef}
        style={{ opacity: 0 }}
        className="fixed left-0 top-0 h-8 w-8 rounded-full border transition-[border-color,background-color,box-shadow] duration-200 will-change-transform backdrop-blur-[1px]"
      />
      <div
        ref={innerRef}
        style={{ opacity: 0 }}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] transition-opacity duration-150 will-change-transform"
      />
    </div>
  );
}
