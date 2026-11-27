'use client';

import { useCallback, useEffect, useRef } from 'react';

const gestureEvents = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
const roarUrl = '/audio/gainde-lion-roar.mp3';

export function useLionRoar(paused: boolean) {
  const syncPlayer = useRef<(() => void) | null>(null);
  const progress = useRef<number | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    syncPlayer.current?.();
  }, [paused]);

  useEffect(() => {
    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      return;
    }

    const lifetime = new AbortController();
    const gain = context.createGain();
    gain.gain.value = 0.55;
    gain.connect(context.destination);
    let clip: AudioBuffer | undefined;
    let playing: AudioBufferSourceNode | undefined;
    let started = false;
    let reachedCue = false;

    function stop() {
      const active = playing;
      if (!active) return;
      playing = undefined;
      active.onended = null;
      active.stop();
      active.disconnect();
    }

    function dispose() {
      if (lifetime.signal.aborted) return;
      syncPlayer.current = null;
      lifetime.abort();
      stop();
      gain.disconnect();
      void context.close().catch(() => undefined);
    }

    function unlock() {
      if (context.state === 'running' || context.state === 'closed') return;
      void context.resume().catch(() => undefined);
    }

    function gesture(event: Event) {
      if (event.isTrusted) unlock();
    }

    function sync() {
      if (lifetime.signal.aborted) return;
      const cue = progress.current;
      if (cue === null) {
        if (reachedCue) dispose();
        return;
      }
      if (pausedRef.current) {
        stop();
        started = false;
        return;
      }
      if (!reachedCue) {
        reachedCue = true;
        unlock();
      }
      if (!clip || started || context.state !== 'running') return;
      const offset = cue * clip.duration;
      if (offset > clip.duration - 0.1) return;
      const source = context.createBufferSource();
      source.buffer = clip;
      source.connect(gain);
      source.onended = () => {
        source.disconnect();
        if (playing === source) playing = undefined;
      };
      source.start(0, offset);
      playing = source;
      started = true;
    }

    syncPlayer.current = sync;
    // Appeler resume durant le geste natif couvre les navigateurs qui bloquent la lecture automatique.
    const options = { capture: true, signal: lifetime.signal, passive: true };
    for (const type of gestureEvents) window.addEventListener(type, gesture, options);
    context.addEventListener('statechange', sync, { signal: lifetime.signal });
    unlock();
    void fetch(roarUrl, { signal: lifetime.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Rugissement indisponible');
        return response.arrayBuffer();
      })
      .then((audio) => context.decodeAudioData(audio))
      .then((buffer) => {
        clip = buffer;
        sync();
      })
      .catch(() => undefined);

    return dispose;
  }, []);

  return useCallback((cueProgress: number | null) => {
    progress.current = cueProgress;
    syncPlayer.current?.();
  }, []);
}
