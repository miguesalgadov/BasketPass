/*
  Warnings:

  - You are about to drop the column `externalTeamCity` on the `ChampParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `externalTeamName` on the `ChampParticipant` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ChampAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "championshipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChampAuditLog_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChampAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChampParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "championshipId" TEXT NOT NULL,
    "teamId" TEXT,
    "externalName" TEXT,
    "externalShort" TEXT,
    "externalCity" TEXT,
    "externalContact" TEXT,
    "externalNotes" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "seed" INTEGER,
    "withdrawnAt" DATETIME,
    "withdrawReason" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT,
    CONSTRAINT "ChampParticipant_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChampParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChampParticipant_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChampParticipant" ("championshipId", "id", "isConfirmed", "seed", "teamId", "withdrawnAt") SELECT "championshipId", "id", "isConfirmed", "seed", "teamId", "withdrawnAt" FROM "ChampParticipant";
DROP TABLE "ChampParticipant";
ALTER TABLE "new_ChampParticipant" RENAME TO "ChampParticipant";
CREATE UNIQUE INDEX "ChampParticipant_championshipId_teamId_key" ON "ChampParticipant"("championshipId", "teamId");
CREATE TABLE "new_Championship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "organizer" TEXT,
    "format" TEXT NOT NULL DEFAULT 'DOUBLE_ROUND_ROBIN',
    "scoringSystem" TEXT NOT NULL DEFAULT 'FIBA',
    "hasPlayoffs" BOOLEAN NOT NULL DEFAULT true,
    "playoffTeams" INTEGER NOT NULL DEFAULT 4,
    "playoffFormat" TEXT NOT NULL DEFAULT 'SINGLE_ELIMINATION',
    "playoffSeries" INTEGER NOT NULL DEFAULT 1,
    "hasThirdPlace" BOOLEAN NOT NULL DEFAULT true,
    "playoffSeeding" TEXT NOT NULL DEFAULT 'FIBA_STANDARD',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "minTeams" INTEGER NOT NULL DEFAULT 8,
    "maxTeams" INTEGER NOT NULL DEFAULT 8,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "daysBetweenRounds" INTEGER NOT NULL DEFAULT 7,
    "defaultVenue" TEXT,
    "walkoverScore" INTEGER NOT NULL DEFAULT 20,
    "walkoverWaitMins" INTEGER NOT NULL DEFAULT 15,
    "maxForeignPlayers" INTEGER,
    "createdById" TEXT NOT NULL,
    "fixtureGeneratedAt" DATETIME,
    "deletedAt" DATETIME,
    "deleteReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Championship_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Championship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Championship" ("category", "clubId", "createdAt", "createdById", "endDate", "format", "hasPlayoffs", "hasThirdPlace", "id", "name", "playoffFormat", "playoffSeries", "playoffTeams", "scoringSystem", "season", "startDate", "status", "updatedAt") SELECT "category", "clubId", "createdAt", "createdById", "endDate", "format", "hasPlayoffs", "hasThirdPlace", "id", "name", "playoffFormat", "playoffSeries", "playoffTeams", "scoringSystem", "season", "startDate", "status", "updatedAt" FROM "Championship";
DROP TABLE "Championship";
ALTER TABLE "new_Championship" RENAME TO "Championship";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
