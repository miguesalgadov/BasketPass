-- CreateTable
CREATE TABLE "Championship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'DOUBLE_ROUND_ROBIN',
    "scoringSystem" TEXT NOT NULL DEFAULT 'FIBA',
    "hasPlayoffs" BOOLEAN NOT NULL DEFAULT true,
    "playoffTeams" INTEGER NOT NULL DEFAULT 4,
    "playoffFormat" TEXT NOT NULL DEFAULT 'SINGLE_ELIMINATION',
    "playoffSeries" INTEGER NOT NULL DEFAULT 1,
    "hasThirdPlace" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Championship_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Championship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChampParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "championshipId" TEXT NOT NULL,
    "teamId" TEXT,
    "externalTeamName" TEXT,
    "externalTeamCity" TEXT,
    "seed" INTEGER,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnAt" DATETIME,
    CONSTRAINT "ChampParticipant_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChampParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "championshipId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'REGULAR',
    "scheduledDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Round_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChampMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "championshipId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "venue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "isWalkover" BOOLEAN NOT NULL DEFAULT false,
    "walkoverTeamId" TEXT,
    "homeQ1" INTEGER,
    "homeQ2" INTEGER,
    "homeQ3" INTEGER,
    "homeQ4" INTEGER,
    "homeOT" INTEGER,
    "awayQ1" INTEGER,
    "awayQ2" INTEGER,
    "awayQ3" INTEGER,
    "awayQ4" INTEGER,
    "awayOT" INTEGER,
    "isPlayoff" BOOLEAN NOT NULL DEFAULT false,
    "playoffRound" INTEGER,
    "seriesGame" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChampMatch_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChampMatch_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChampMatch_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "ChampParticipant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChampMatch_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "ChampParticipant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChampPlayerStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamParticipantId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "fg2Made" INTEGER NOT NULL DEFAULT 0,
    "fg2Attempted" INTEGER NOT NULL DEFAULT 0,
    "fg3Made" INTEGER NOT NULL DEFAULT 0,
    "fg3Attempted" INTEGER NOT NULL DEFAULT 0,
    "ftMade" INTEGER NOT NULL DEFAULT 0,
    "ftAttempted" INTEGER NOT NULL DEFAULT 0,
    "offRebounds" INTEGER NOT NULL DEFAULT 0,
    "defRebounds" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "steals" INTEGER NOT NULL DEFAULT 0,
    "blocks" INTEGER NOT NULL DEFAULT 0,
    "turnovers" INTEGER NOT NULL DEFAULT 0,
    "foulsPersonal" INTEGER NOT NULL DEFAULT 0,
    "foulsTechnical" INTEGER NOT NULL DEFAULT 0,
    "plusMinus" INTEGER NOT NULL DEFAULT 0,
    "didNotPlay" BOOLEAN NOT NULL DEFAULT false,
    "dnpReason" TEXT,
    CONSTRAINT "ChampPlayerStat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ChampMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChampPlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "championshipId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "walkoversWon" INTEGER NOT NULL DEFAULT 0,
    "walkoversLost" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
    "tablePoints" INTEGER NOT NULL DEFAULT 0,
    "pointsDiff" INTEGER NOT NULL DEFAULT 0,
    "h2hRecord" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Standing_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Standing_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ChampParticipant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayoffBracket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "championshipId" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "winnerId" TEXT,
    "runnerUpId" TEXT,
    "thirdPlaceId" TEXT,
    CONSTRAINT "PlayoffBracket_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Standing_participantId_key" ON "Standing"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayoffBracket_championshipId_key" ON "PlayoffBracket"("championshipId");
