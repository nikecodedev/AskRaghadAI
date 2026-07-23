-- Run in Neon SQL Editor (console.neon.tech → SQL Editor)
-- Creates homepage category cards table for Raghad AI Phase 1

CREATE TABLE IF NOT EXISTS "CategoryCard" (
  "id" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "descriptionAr" TEXT NOT NULL,
  "link" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CategoryCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CategoryCard_active_sortOrder_idx"
  ON "CategoryCard"("active", "sortOrder");
