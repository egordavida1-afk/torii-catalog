"use client";

import { useEffect, useRef } from "react";
import { saveWatchProgress } from "./watch/actions";

export default function WatchVideo({
  animeId,
  seasonNumber,
  episodeNumber,
  videoUrl,
  initialPosition = 0,
  initialCompleted = false,
}: {
  animeId: string;
  seasonNumber: number;
  episodeNumber: number;
  videoUrl: string;
  initialPosition?: number;
  initialCompleted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedAt = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!videoRef.current || initialized.current) return;
    initialized.current = true;
    if (initialPosition > 3 && !initialCompleted) {
      const applyPosition = () => {
        const video = videoRef.current;
        if (!video || !Number.isFinite(video.duration)) return;
        video.currentTime = Math.min(initialPosition, Math.max(0, video.duration - 1));
      };
      videoRef.current.addEventListener("loadedmetadata", applyPosition, { once: true });
      return () => videoRef.current?.removeEventListener("loadedmetadata", applyPosition);
    }
  }, [initialPosition, initialCompleted]);

  async function persist(video: HTMLVideoElement, completed = false) {
    await saveWatchProgress({
      animeId,
      seasonNumber,
      episodeNumber,
      positionSeconds: Math.floor(video.currentTime || 0),
      durationSeconds: Number.isFinite(video.duration) ? Math.floor(video.duration) : null,
      completed,
    });
    lastSavedAt.current = Date.now();
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      playsInline
      preload="metadata"
      onPlay={() => {
        if (videoRef.current) void persist(videoRef.current, initialCompleted);
      }}
      onTimeUpdate={() => {
        const video = videoRef.current;
        if (!video) return;
        if (Date.now() - lastSavedAt.current < 10000) return;
        void persist(video, initialCompleted);
      }}
      onEnded={() => {
        const video = videoRef.current;
        if (video) void persist(video, true);
      }}
    >
      Ваш браузер не поддерживает видео.
    </video>
  );
}
