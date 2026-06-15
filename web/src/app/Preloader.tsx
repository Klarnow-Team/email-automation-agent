"use client";

import { useEffect, useState } from "react";

const WORD = "KLARNOW";
const CHAR_DELAY_MS = 120;
const CURSOR_BLINK_MS = 500;
const HOLD_AFTER_TYPING_MS = 700;
const FADE_OUT_MS = 450;

function PreloaderLogo({ className }: { className?: string }) {
  return (
    <img
      src="/dark-klarnow-logo.svg"
      alt=""
      className={className}
      aria-hidden
    />
  );
}

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [length, setLength] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    if (length < WORD.length) return;
    let cursorInterval: ReturnType<typeof setInterval>;
    let holdTimer: ReturnType<typeof setTimeout>;
    let fadeTimer: ReturnType<typeof setTimeout>;

    cursorInterval = setInterval(() => {
      setCursorOn((c) => !c);
    }, CURSOR_BLINK_MS);

    holdTimer = setTimeout(() => {
      clearInterval(cursorInterval);
      setCursorOn(false);
      setFadeOut(true);
      fadeTimer = setTimeout(() => setVisible(false), FADE_OUT_MS);
    }, HOLD_AFTER_TYPING_MS);

    return () => {
      clearInterval(cursorInterval);
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
    };
  }, [length]);

  useEffect(() => {
    if (length >= WORD.length) return;
    const t = setTimeout(() => setLength((n) => n + 1), CHAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [length]);

  if (!visible) return null;

  return (
    <div
      className={`preloader ${fadeOut ? "preloader-fade-out" : ""}`}
      aria-live="polite"
      aria-label="Loading KLARNOW"
    >
      <div className="preloader-inner">
        <div className="preloader-logo-wrap">
          <PreloaderLogo className="preloader-logo" />
        </div>
        <span className="preloader-word">
          {WORD.slice(0, length)}
          <span
            className="preloader-cursor"
            style={{ opacity: cursorOn ? 1 : 0 }}
            aria-hidden
          >
            |
          </span>
        </span>
      </div>
    </div>
  );
}
