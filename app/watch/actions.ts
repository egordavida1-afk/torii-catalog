"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

function wholeNonNegative(value: unknown, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

export async function saveWatchProgress(input: {
  animeId: string;
  seasonNumber?: number;
  episodeNumber?: number;
  positionSeconds?: number;
  durationSeconds?: number | null;
  completed?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user || !input?.animeId) return { ok: false };

  const seasonNumber = wholeNonNegative(input.seasonNumber);
  const episodeNumber = wholeNonNegative(input.episodeNumber);
  const positionSeconds = wholeNonNegative(input.positionSeconds);
  const durationSeconds = input.durationSeconds == null ? null : wholeNonNegative(input.durationSeconds);
  const completed = Boolean(input.completed);

  await prisma.watchProgress.upsert({
    where: {
      userId_animeId_seasonNumber_episodeNumber: {
        userId: user.id,
        animeId: input.animeId,
        seasonNumber,
        episodeNumber,
      },
    },
    update: {
      positionSeconds,
      durationSeconds,
      completed,
    },
    create: {
      userId: user.id,
      animeId: input.animeId,
      seasonNumber,
      episodeNumber,
      positionSeconds,
      durationSeconds,
      completed,
    },
  });

  return { ok: true };
}

export async function markEpisodeStarted(animeId: string, seasonNumber: number, episodeNumber: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const existing = await prisma.watchProgress.findUnique({
    where: {
      userId_animeId_seasonNumber_episodeNumber: {
        userId: user.id,
        animeId,
        seasonNumber,
        episodeNumber,
      },
    },
    select: { completed: true },
  });
  if (existing?.completed) return { ok: true };
  return saveWatchProgress({ animeId, seasonNumber, episodeNumber, positionSeconds: 0, completed: false });
}

export async function markEpisodeWatched(animeId: string, seasonNumber: number, episodeNumber: number) {
  return saveWatchProgress({ animeId, seasonNumber, episodeNumber, positionSeconds: 0, completed: true });
}
