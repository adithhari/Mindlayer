import { useRef, useCallback, useEffect } from 'react';

/**
 * Shared AudioContext + AnalyserNode.
 * - connectMicStream(stream)  → tap mic audio into analyser
 * - ensureCtx()               → returns {ctx, analyser} so Home.jsx can pipe TTS through same node
 * - startLoop() / stopLoop()  → 60fps RAF amplitude reading into amplitudeRef (no re-renders)
 * - amplitudeRef.current      → 0..1, read by OrbScene every frame
 */
export function useAudioAnalyzer() {
  const ctxRef      = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef   = useRef(null);
  const rafRef      = useRef(null);
  const dataRef     = useRef(null);
  const amplitudeRef = useRef(0);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx     = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize              = 256;
      analyser.smoothingTimeConstant = 0.75;
      analyser.connect(ctx.destination);
      ctxRef.current      = ctx;
      analyserRef.current = analyser;
      dataRef.current     = new Uint8Array(analyser.frequencyBinCount);
    }
    return { ctx: ctxRef.current, analyser: analyserRef.current };
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current) return; // already running
    const tick = () => {
      if (!analyserRef.current || !dataRef.current) return;
      analyserRef.current.getByteFrequencyData(dataRef.current);
      let sum = 0;
      const d = dataRef.current;
      for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
      amplitudeRef.current = Math.min(Math.sqrt(sum / d.length) / 90, 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Decay to 0 instead of snapping
    amplitudeRef.current = 0;
  }, []);

  const disconnectSource = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) {}
      sourceRef.current = null;
    }
  }, []);

  const connectMicStream = useCallback((stream) => {
    const { ctx, analyser } = ensureCtx();
    disconnectSource();
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);
    sourceRef.current = src;
    startLoop();
  }, [ensureCtx, disconnectSource, startLoop]);

  const disconnect = useCallback(() => {
    stopLoop();
    disconnectSource();
  }, [stopLoop, disconnectSource]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      disconnectSource();
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    amplitudeRef,
    analyserRef,
    ensureCtx,
    connectMicStream,
    startLoop,
    stopLoop,
    disconnect,
  };
}
