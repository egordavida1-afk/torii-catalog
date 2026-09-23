CREATE TABLE "WatchProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "animeId" TEXT NOT NULL,
  "seasonNumber" INTEGER NOT NULL DEFAULT 0,
  "episodeNumber" INTEGER NOT NULL DEFAULT 0,
  "positionSeconds" INTEGER NOT NULL DEFAULT 0,
  "durationSeconds" INTEGER,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WatchProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WatchProgress_userId_animeId_seasonNumber_episodeNumber_key"
  ON "WatchProgress"("userId", "animeId", "seasonNumber", "episodeNumber");

CREATE INDEX "WatchProgress_userId_updatedAt_idx"
  ON "WatchProgress"("userId", "updatedAt");

CREATE INDEX "WatchProgress_animeId_idx"
  ON "WatchProgress"("animeId");

ALTER TABLE "WatchProgress"
  ADD CONSTRAINT "WatchProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WatchProgress"
  ADD CONSTRAINT "WatchProgress_animeId_fkey"
  FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
