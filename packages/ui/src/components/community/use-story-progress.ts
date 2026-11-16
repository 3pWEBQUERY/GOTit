"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

/** Takt des Timers in Millisekunden. */
export const STORY_TICK_MS = 100;
export const STORY_DEFAULT_DURATION_MS = 5000;

interface ProgressState {
  index: number;
  /** Abgelaufene Zeit des aktuellen Teils in Millisekunden. */
  elapsed: number;
  paused: boolean;
  /** Der letzte Teil ist abgelaufen. */
  finished: boolean;
}

type ProgressAction =
  | { type: "tick"; ms: number; duration: number; count: number }
  | { type: "go"; index: number; count: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "toggle" };

function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(0, index), Math.max(0, count - 1));
}

/** Reiner Zustandsübergang des Story-Fortschritts; getrennt vom Timer, damit er ohne Uhr prüfbar ist. */
export function storyProgressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "tick": {
      if (state.paused || state.finished) return state;
      const elapsed = state.elapsed + action.ms;
      if (elapsed < action.duration) return { ...state, elapsed };
      if (state.index >= action.count - 1) return { ...state, elapsed: action.duration, finished: true };
      return { ...state, index: state.index + 1, elapsed: 0 };
    }
    case "go":
      return { ...state, index: clampIndex(action.index, action.count), elapsed: 0, finished: false };
    case "pause":
      return { ...state, paused: true };
    case "resume":
      return { ...state, paused: false };
    case "toggle":
      return { ...state, paused: !state.paused };
  }
}

export interface StoryProgressOptions {
  /** Anzahl Teile der Story. */
  count: number;
  /** Dauer je Teil in Millisekunden; fehlt ein Wert, gilt `defaultDuration`. */
  durations?: readonly (number | undefined)[];
  defaultDuration?: number;
  /** Ohne automatisches Weiterlaufen (bei reduzierter Bewegung) wechselt nur der Mensch den Teil. */
  autoAdvance?: boolean;
  /** Vorübergehend angehalten, solange gedrückt gehalten wird. */
  holding?: boolean;
  initialIndex?: number;
  /** Der letzte Teil ist abgelaufen oder es wurde über das Ende hinaus weitergeblättert. */
  onComplete?: () => void;
}

export interface StoryProgress {
  index: number;
  /** Fortschritt des aktuellen Teils von 0 bis 1. */
  fraction: number;
  /** Vom Menschen angehalten (nicht: nur gehalten). */
  paused: boolean;
  next: () => void;
  previous: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
}

/**
 * Zeitsteuerung des `StoryViewer`: zählt den aktuellen Teil hoch, wechselt am Ende zum nächsten
 * und meldet nach dem letzten `onComplete`. Angehalten wird durch Pause, Halten oder `autoAdvance: false`.
 */
export function useStoryProgress({ count, durations, defaultDuration = STORY_DEFAULT_DURATION_MS, autoAdvance = true, holding = false, initialIndex = 0, onComplete }: StoryProgressOptions): StoryProgress {
  const [state, dispatch] = useReducer(storyProgressReducer, undefined, () => ({ index: clampIndex(initialIndex, count), elapsed: 0, paused: false, finished: false }));
  const index = clampIndex(state.index, count);
  const duration = Math.max(STORY_TICK_MS, durations?.[index] ?? defaultDuration);
  const running = autoAdvance && count > 0 && !state.paused && !holding && !state.finished;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => dispatch({ type: "tick", ms: STORY_TICK_MS, duration, count }), STORY_TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, duration, count]);

  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    if (state.finished) completeRef.current?.();
  }, [state.finished]);

  const next = useCallback(() => {
    if (index >= count - 1) completeRef.current?.();
    else dispatch({ type: "go", index: index + 1, count });
  }, [index, count]);
  const previous = useCallback(() => dispatch({ type: "go", index: index - 1, count }), [index, count]);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const resume = useCallback(() => dispatch({ type: "resume" }), []);
  const toggle = useCallback(() => dispatch({ type: "toggle" }), []);

  return { index, fraction: autoAdvance ? Math.min(1, state.elapsed / duration) : 0, paused: state.paused, next, previous, pause, resume, toggle };
}
