CREATE TABLE "SiteSettings" (
  "id" TEXT NOT NULL,
  "backgroundUrl" TEXT,
  "defaultAccent" TEXT NOT NULL DEFAULT '#E8A33D',
  "buttonTextColor" TEXT NOT NULL DEFAULT '#171208',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
