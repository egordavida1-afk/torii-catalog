CREATE TABLE "Anime" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "posterUrl" TEXT,
  "backgroundUrl" TEXT,
  "year" INTEGER,
  "genres" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ongoing',
  "type" TEXT NOT NULL DEFAULT 'series',
  "videoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Anime_slug_key" ON "Anime"("slug");
CREATE INDEX "Anime_createdAt_idx" ON "Anime"("createdAt");
CREATE INDEX "Anime_type_idx" ON "Anime"("type");

CREATE TABLE "Season" (
  "id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT,
  "animeId" TEXT NOT NULL,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Season_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Season_animeId_number_key" ON "Season"("animeId", "number");

CREATE TABLE "Episode" (
  "id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT,
  "videoUrl" TEXT NOT NULL,
  "duration" INTEGER,
  "releaseDate" TIMESTAMP(3),
  "seasonId" TEXT NOT NULL,
  CONSTRAINT "Episode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Episode_seasonId_number_key" ON "Episode"("seasonId", "number");

CREATE TABLE "Genre" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");
CREATE INDEX "Genre_createdAt_idx" ON "Genre"("createdAt");

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
