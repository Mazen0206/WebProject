import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Reuse a single PrismaClient between hot-reloads in dev to avoid
// exhausting the database connection pool.
const globalForPrisma = globalThis;
const sqliteUrl = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(/^file:/, "");
const adapter = new PrismaBetterSqlite3({ url: sqliteUrl });

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
