-- Suche, Favoriten, gespeicherte Suchen (Schritt 1.7, Entscheid 0013).
-- Trigram-Index für Namen und Vorschläge (PRD v2 13, «pg_trgm und Volltext für die Suche»).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "region" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_profile" (
    "providerProfileId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "audience" "ProfileAudience" NOT NULL,
    "identityValidUntil" TIMESTAMP(3) NOT NULL,
    "shortDescription" TEXT,
    "languages" TEXT[],
    "regionIds" TEXT[],
    "primaryRegionId" TEXT,
    "locationLabel" TEXT,
    "categoryIds" TEXT[],
    "priceFromChf" INTEGER,
    "hasPhotos" BOOLEAN NOT NULL,
    "coverMediaId" TEXT,
    "coverColor" TEXT,
    "coverAlt" TEXT,
    "completeness" INTEGER NOT NULL,
    "searchTerms" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "contentUpdatedAt" TIMESTAMP(3) NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Volltext über Name (Gewicht A), Kurzbeschreibung (B), Regionen und Kategorien in allen Sprachen (C).
    -- Konfiguration «simple»: mehrsprachige Inhalte, keine sprachabhängige Stammformbildung.
    "search_vector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple'::regconfig, coalesce("displayName", '')), 'A') ||
        setweight(to_tsvector('simple'::regconfig, coalesce("shortDescription", '')), 'B') ||
        setweight(to_tsvector('simple'::regconfig, coalesce("searchTerms", '')), 'C')
    ) STORED,

    CONSTRAINT "search_profile_pkey" PRIMARY KEY ("providerProfileId")
);

-- CreateTable
CREATE TABLE "saved_search" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "queryKey" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_search_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_userId_sortOrder_idx" ON "collection"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "collection_userId_name_key" ON "collection"("userId", "name");

-- CreateIndex
CREATE INDEX "favorite_collectionId_sortOrder_idx" ON "favorite"("collectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "favorite_providerProfileId_idx" ON "favorite"("providerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_collectionId_providerProfileId_key" ON "favorite"("collectionId", "providerProfileId");

-- CreateIndex
CREATE INDEX "search_profile_regionIds_idx" ON "search_profile" USING GIN ("regionIds");

-- CreateIndex
CREATE INDEX "search_profile_categoryIds_idx" ON "search_profile" USING GIN ("categoryIds");

-- CreateIndex
CREATE INDEX "search_profile_languages_idx" ON "search_profile" USING GIN ("languages");

-- CreateIndex
CREATE INDEX "search_profile_displayName_trgm_idx" ON "search_profile" USING GIN ("displayName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "search_profile_publishedAt_idx" ON "search_profile"("publishedAt");

-- CreateIndex
CREATE INDEX "search_profile_contentUpdatedAt_idx" ON "search_profile"("contentUpdatedAt");

-- CreateIndex
CREATE INDEX "search_profile_priceFromChf_idx" ON "search_profile"("priceFromChf");

-- CreateIndex
CREATE INDEX "saved_search_userId_createdAt_idx" ON "saved_search"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_search_userId_queryKey_key" ON "saved_search"("userId", "queryKey");

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_profile" ADD CONSTRAINT "search_profile_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_search" ADD CONSTRAINT "saved_search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Volltextindex über die generierte Spalte (in Prisma nicht abbildbar).
CREATE INDEX "search_profile_search_vector_idx" ON "search_profile" USING GIN ("search_vector");
