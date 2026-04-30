import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient between hot-reloads in dev to avoid
// exhausting the database connection pool.
const globalForPrisma = globalThis;

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
