"use client";

import { useEffect, useState } from "react";

const THRESHOLD = 8;

/** Meldet, ob zuletzt nach unten gescrollt wurde. Oben auf der Seite gilt immer «hoch». */
export function useScrolledDown(): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    function onScroll() {
      const current = window.scrollY;
      if (Math.abs(current - last) < THRESHOLD) return;
      setDown(current > last && current > 64);
      last = current;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return down;
}
