/*
  Migration to add Ledger support
  Steps:
  1. Create Ledger table
  2. Create default ledgers for each user
  3. Add ledgerId columns (nullable first)
  4. Update existing data to use default ledgers
  5. Make ledgerId columns required
  6. Add foreign key constraints and indexes
*/

-- Step 1: Create Ledger table
CREATE TABLE "Ledger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 2: Create default ledgers for each user
INSERT INTO "Ledger" ("name", "description", "isDefault", "userId", "createdAt", "updatedAt")
SELECT '默认账本', '自动创建的默认账本', true, "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User";

-- Step 3: Add ledgerId columns as nullable first
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Alter Account table - add nullable ledgerId
CREATE TABLE "new_Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "balance" DECIMAL NOT NULL DEFAULT 0.00,
    "userId" INTEGER NOT NULL,
    "ledgerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("balance", "createdAt", "id", "name", "type", "updatedAt", "userId", "ledgerId")
SELECT "balance", "createdAt", "id", "name", "type", "updatedAt", "userId", NULL
FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";

-- Alter Category table - add nullable ledgerId
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "ledgerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("createdAt", "icon", "id", "isDefault", "name", "type", "updatedAt", "userId", "ledgerId")
SELECT "createdAt", "icon", "id", "isDefault", "name", "type", "updatedAt", "userId", NULL
FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";

-- Alter Transaction table - add nullable ledgerId
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "ledgerId" INTEGER,
    "accountId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "toAccountId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "categoryId", "createdAt", "date", "description", "id", "toAccountId", "type", "updatedAt", "userId", "ledgerId")
SELECT "accountId", "amount", "categoryId", "createdAt", "date", "description", "id", "toAccountId", "type", "updatedAt", "userId", NULL
FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Step 4: Update existing data to use default ledgers
UPDATE "Account" SET "ledgerId" = (
    SELECT "id" FROM "Ledger" WHERE "Ledger"."userId" = "Account"."userId" AND "isDefault" = true
);

UPDATE "Category" SET "ledgerId" = (
    SELECT "id" FROM "Ledger" WHERE "Ledger"."userId" = "Category"."userId" AND "isDefault" = true
) WHERE "userId" IS NOT NULL;

UPDATE "Transaction" SET "ledgerId" = (
    SELECT "id" FROM "Ledger" WHERE "Ledger"."userId" = "Transaction"."userId" AND "isDefault" = true
);

-- Step 5: Make ledgerId columns required and add foreign keys
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Recreate Account table with required ledgerId
CREATE TABLE "new_Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "balance" DECIMAL NOT NULL DEFAULT 0.00,
    "userId" INTEGER NOT NULL,
    "ledgerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Account_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Account" SELECT * FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_ledgerId_name_key" ON "Account"("ledgerId", "name");

-- Recreate Category table with ledgerId foreign key
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "ledgerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Category" SELECT * FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_ledgerId_name_key" ON "Category"("ledgerId", "name");

-- Recreate Transaction table with required ledgerId
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "ledgerId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "toAccountId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" SELECT * FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Step 6: Create indexes
CREATE UNIQUE INDEX "Ledger_userId_name_key" ON "Ledger"("userId", "name");
