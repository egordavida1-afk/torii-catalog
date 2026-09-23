-- AlterTable
ALTER TABLE "Anime"
ADD COLUMN "originalTitle" TEXT,
ADD COLUMN "kinopoiskId" TEXT,
ADD COLUMN "imdbId" TEXT,
ADD COLUMN "shikimoriId" TEXT,
ADD COLUMN "kodikUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KodikSource" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "kodikId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "translationId" INTEGER,
    "translationTitle" TEXT,
    "translationType" TEXT,
    "quality" TEXT,
    "camrip" BOOLEAN NOT NULL DEFAULT false,
    "kodikUpdatedAt" TIMESTAMP(3),
    "lastSeason" INTEGER,
    "lastEpisode" INTEGER,
    "episodesCount" INTEGER,
    "seasonsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KodikSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anime_kinopoiskId_idx" ON "Anime"("kinopoiskId");
CREATE INDEX "Anime_imdbId_idx" ON "Anime"("imdbId");
CREATE INDEX "Anime_shikimoriId_idx" ON "Anime"("shikimoriId");
CREATE INDEX "KodikSource_animeId_idx" ON "KodikSource"("animeId");
CREATE INDEX "KodikSource_kodikId_idx" ON "KodikSource"("kodikId");
CREATE INDEX "KodikSource_kodikUpdatedAt_idx" ON "KodikSource"("kodikUpdatedAt");
CREATE UNIQUE INDEX "KodikSource_animeId_kodikId_key" ON "KodikSource"("animeId", "kodikId");

-- AddForeignKey
ALTER TABLE "KodikSource" ADD CONSTRAINT "KodikSource_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
