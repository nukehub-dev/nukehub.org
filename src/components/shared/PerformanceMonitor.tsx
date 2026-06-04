"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface FrameData {
  fps: number;
  frameTime: number;
  timestamp: number;
}

const STORAGE_KEY = "perf-monitor-state";

interface MonitorState {
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
}

function loadState(): MonitorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return { x: 16, y: 16, w: 300, h: 420, minimized: false };
}

function saveState(s: MonitorState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [fps, setFps] = useState(0);
  const [avgFps, setAvgFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [memory, setMemory] = useState<number | null>(null);
  const [domNodes, setDomNodes] = useState(0);
  const [layoutShifts, setLayoutShifts] = useState(0);
  const [webVitals, setWebVitals] = useState<{
    lcp?: number;
    fcp?: number;
    ttfb?: number;
  }>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameHistoryRef = useRef<FrameData[]>([]);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const layoutShiftsRef = useRef(0);

  const stateRef = useRef<MonitorState>(loadState());
  const [pos, setPos] = useState({
    x: stateRef.current.x,
    y: stateRef.current.y,
  });
  const [size, setSize] = useState({
    w: stateRef.current.w,
    h: stateRef.current.h,
  });
  const [minimized, setMinimized] = useState(stateRef.current.minimized);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);
  const resizeRef = useRef<{
    resizing: boolean;
    startX: number;
    startY: number;
    initW: number;
    initH: number;
  } | null>(null);

  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      x: pos.x,
      y: pos.y,
      w: size.w,
      h: size.h,
      minimized,
    };
    saveState(stateRef.current);
  }, [pos, size, minimized]);

  // FPS tracking
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
        lastFpsUpdateRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      frameCountRef.current++;

      const elapsed = timestamp - lastFpsUpdateRef.current;
      if (elapsed >= 500) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        const currentFrameTime = Math.round(delta * 10) / 10;

        setFps(currentFps);
        setFrameTime(currentFrameTime);

        frameHistoryRef.current.push({
          fps: currentFps,
          frameTime: currentFrameTime,
          timestamp,
        });
        if (frameHistoryRef.current.length > 120)
          frameHistoryRef.current.shift();

        const recent = frameHistoryRef.current.slice(-20);
        const avg = Math.round(
          recent.reduce((sum, f) => sum + f.fps, 0) / recent.length,
        );
        setAvgFps(avg);

        frameCountRef.current = 0;
        lastFpsUpdateRef.current = timestamp;

        const perf = performance as any;
        if (perf.memory)
          setMemory(Math.round(perf.memory.usedJSHeapSize / 1048576));
        setDomNodes(document.querySelectorAll("*").length);
        setLayoutShifts(layoutShiftsRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Sparkline
  useEffect(() => {
    if (!isVisible || minimized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const history = frameHistoryRef.current;
    if (history.length < 2) return;

    const maxFps = 75;
    const step = width / (history.length - 1);

    // Background grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((p) => {
      const y = height * p;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });

    // FPS area fill
    ctx.beginPath();
    history.forEach((frame, i) => {
      const x = i * step;
      const y = height - (Math.min(frame.fps, maxFps) / maxFps) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(34, 197, 94, 0.18)");
    grad.addColorStop(1, "rgba(34, 197, 94, 0.01)");
    ctx.fillStyle = grad;
    ctx.fill();

    // FPS line
    ctx.beginPath();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    history.forEach((frame, i) => {
      const x = i * step;
      const y = height - (Math.min(frame.fps, maxFps) / maxFps) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 60 FPS line
    const y60 = height - (60 / maxFps) * height;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y60);
    ctx.lineTo(width, y60);
    ctx.stroke();
    ctx.setLineDash([]);

    // 60 label
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.font = "9px monospace";
    ctx.textAlign = "right";
    ctx.fillText("60", width - 4, y60 - 3);
  }, [isVisible, minimized, fps, size.w, size.h]);

  // Layout Shift Observer
  useEffect(() => {
    if (!("PerformanceObserver" in window)) return;
    let observer: PerformanceObserver;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue;
          layoutShiftsRef.current += (entry as any).value || 0;
        }
      });
      observer.observe({ type: "layout-shift", buffered: true } as any);
    } catch {
      /* unsupported */
    }
    return () => observer?.disconnect();
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setIsVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Web Vitals
  useEffect(() => {
    const gather = () => {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const paint = performance.getEntriesByType("paint");
      const lcpEntry = performance
        .getEntriesByType("largest-contentful-paint")
        .pop() as PerformanceEntry | undefined;
      setWebVitals({
        ttfb: nav ? Math.round(nav.responseStart) : undefined,
        fcp: paint.find((p) => p.name === "first-contentful-paint")
          ? Math.round(
              paint.find((p) => p.name === "first-contentful-paint")!.startTime,
            )
          : undefined,
        lcp: lcpEntry ? Math.round(lcpEntry.startTime) : undefined,
      });
    };
    const t = setTimeout(gather, 2000);
    return () => clearTimeout(t);
  }, []);

  // Drag
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        initX: pos.x,
        initY: pos.y,
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    },
    [pos.x, pos.y],
  );

  // Resize
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      resizeRef.current = {
        resizing: true,
        startX: e.clientX,
        startY: e.clientY,
        initW: size.w,
        initH: size.h,
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "nwse-resize";
    },
    [size.w, size.h],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current?.dragging) {
        const d = dragRef.current;
        setPos({
          x: d.initX + (e.clientX - d.startX),
          y: d.initY + (e.clientY - d.startY),
        });
      }
      if (resizeRef.current?.resizing) {
        const r = resizeRef.current;
        setSize({
          w: Math.max(240, r.initW + (e.clientX - r.startX)),
          h: Math.max(160, r.initH + (e.clientY - r.startY)),
        });
      }
    };
    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const getFpsColor = useCallback((value: number) => {
    if (value >= 55) return "text-emerald-400";
    if (value >= 30) return "text-amber-400";
    return "text-rose-400";
  }, []);

  const getStatusDot = (value: number, good: number, warn: number) => {
    const color =
      value <= good
        ? "bg-emerald-400"
        : value <= warn
          ? "bg-amber-400"
          : "bg-rose-400";
    return (
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${color} ml-1.5 shadow-[0_0_6px_currentColor]`}
      />
    );
  };

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] rounded-xl border border-white/[0.08] bg-[#0a0a0a]/90 backdrop-blur-xl text-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] font-mono text-[11px] flex flex-col overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? "auto" : size.h,
        minWidth: 240,
        minHeight: minimized ? undefined : 160,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06] cursor-grab active:cursor-grabbing shrink-0 bg-white/[0.02]"
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold tracking-wider text-slate-300 text-[10px] uppercase select-none">
            Perf Monitor
          </span>
        </div>
        <div className="flex items-center gap-0.5" data-no-drag>
          <button
            onClick={() => setMinimized((m) => !m)}
            className="text-slate-500 hover:text-slate-200 transition-colors h-6 w-6 flex items-center justify-center rounded-md hover:bg-white/5"
            aria-label={minimized ? "Expand" : "Minimize"}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 12h8" />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-500 hover:text-slate-200 transition-colors h-6 w-6 flex items-center justify-center rounded-md hover:bg-white/5"
            aria-label="Close"
            title="Close"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="px-3.5 py-3 space-y-2.5 overflow-y-auto flex-1">
          {/* Big FPS */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">
                FPS
              </div>
              <div
                className={`text-3xl font-bold tabular-nums leading-none ${getFpsColor(fps)}`}
              >
                {fps}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">
                Avg
              </div>
              <div className="text-sm font-semibold tabular-nums text-slate-300">
                {avgFps}
              </div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-2">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: Math.max(48, size.h * 0.16) }}
            />
          </div>

          {/* Metrics grid */}
          <div className="space-y-1.5">
            <MetricRow
              label="Frame"
              value={`${frameTime.toFixed(1)} ms`}
              dot={getStatusDot(frameTime, 16.7, 33)}
            />
            {memory !== null && (
              <MetricRow label="Memory" value={`${memory} MB`} />
            )}
            <MetricRow label="DOM Nodes" value={domNodes.toLocaleString()} />
            <MetricRow
              label="CLS"
              value={layoutShifts.toFixed(4)}
              dot={getStatusDot(layoutShifts, 0.05, 0.1)}
            />
          </div>

          {/* Web Vitals */}
          {(webVitals.ttfb !== undefined ||
            webVitals.fcp !== undefined ||
            webVitals.lcp !== undefined) && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">
                Web Vitals
              </div>
              {webVitals.ttfb !== undefined && (
                <MetricRow label="TTFB" value={`${webVitals.ttfb} ms`} />
              )}
              {webVitals.fcp !== undefined && (
                <MetricRow label="FCP" value={`${webVitals.fcp} ms`} />
              )}
              {webVitals.lcp !== undefined && (
                <MetricRow label="LCP" value={`${webVitals.lcp} ms`} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Resize handle */}
      {!minimized && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize group"
          onMouseDown={onResizeStart}
          title="Resize"
        >
          {/* Visible resize grip */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="absolute bottom-1.5 right-1.5 text-slate-600 group-hover:text-slate-300 transition-colors"
            fill="currentColor"
          >
            <path d="M11 11h2v2h-2zM7 11h2v2H7zM11 7h2v2h-2z" opacity="0.6" />
          </svg>
          {/* Larger invisible hit area for easier grabbing */}
          <div className="absolute bottom-0 right-0 w-10 h-10" />
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center">
        <span className="tabular-nums text-slate-300 font-medium">{value}</span>
        {dot}
      </div>
    </div>
  );
}
