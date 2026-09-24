"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function CinemaMode({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [cinema, setCinema] = useState(false);

  useEffect(() => {
    const onFullscreen = () => {
      const active = document.fullscreenElement === shellRef.current;
      setCinema(active);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  async function toggleCinema() {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      }
    } catch {
      setCinema((value) => !value);
    }
  }

  return (
    <div ref={shellRef} className={`cinema-shell${cinema ? " is-cinema" : ""}`}>
      <div className="cinema-toolbar">
        <button type="button" className="cinema-button" onClick={() => void toggleCinema()}>
          <span aria-hidden="true">{cinema ? "↙" : "⛶"}</span> {cinema ? "Выйти" : "Кинотеатр"}
        </button>
      </div>
      {children}
    </div>
  );
}
