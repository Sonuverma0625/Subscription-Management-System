import { PrismaClient } from '@prisma/client';

function getRuntimeDatabaseUrl() {
  const pooledUrl = process.env.DATABASE_URL_POOLED;
  if (!pooledUrl) return process.env.DATABASE_URL;

  try {
    const url = new URL(pooledUrl);
    url.searchParams.set('pgbouncer', 'true');
    return url.toString();
  } catch {
    return pooledUrl;
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: { url: getRuntimeDatabaseUrl() },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
