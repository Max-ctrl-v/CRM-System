-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "city" TEXT,
    "pipelineStage" TEXT,
    "perplexityResult" TEXT,
    "perplexityFetchedAt" DATETIME,
    "eigenkapital" TEXT,
    "verlustvortrag" TEXT,
    "gewinnvortrag" TEXT,
    "expectedRevenue" REAL,
    "uisSchwierigkeiten" BOOLEAN NOT NULL DEFAULT false,
    "uisReason" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "companies_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_companies" ("assignedToId", "city", "createdAt", "createdById", "eigenkapital", "gewinnvortrag", "id", "name", "perplexityFetchedAt", "perplexityResult", "pipelineStage", "updatedAt", "verlustvortrag", "website") SELECT "assignedToId", "city", "createdAt", "createdById", "eigenkapital", "gewinnvortrag", "id", "name", "perplexityFetchedAt", "perplexityResult", "pipelineStage", "updatedAt", "verlustvortrag", "website" FROM "companies";
DROP TABLE "companies";
ALTER TABLE "new_companies" RENAME TO "companies";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
