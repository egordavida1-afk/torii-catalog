ALTER TABLE "Anime" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'series';
ALTER TABLE "Anime" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Anime" ADD COLUMN "sourceKey" TEXT;
ALTER TABLE "Anime" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Anime"
SET "category" = CASE WHEN "type" = 'movie' THEN 'movie' ELSE 'series' END
WHERE "category" = 'series';

CREATE UNIQUE INDEX "Anime_sourceKey_key" ON "Anime"("sourceKey");
CREATE INDEX "Anime_updatedAt_idx" ON "Anime"("updatedAt");
CREATE INDEX "Anime_category_idx" ON "Anime"("category");
