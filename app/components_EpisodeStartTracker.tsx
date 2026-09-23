"use client";

import { useEffect, useRef } from "react";
import { markEpisodeStarted } from "./watch/actions";

export default function EpisodeStartTracker({
  animeId,
  seasonNumber,
  episodeNumber,
}: {
  animeId: string;
  seasonNumber: number;
  episodeNumber: number;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || episodeNumber <= 0) return;
    sent.current = true;
    void markEpisodeStarted(animeId, seasonNumber, episodeNumber);
  }, [animeId, seasonNumber, episodeNumber]);

  return null;
}
