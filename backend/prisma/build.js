import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('..', import.meta.url));
const prismaCli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.DATABASE_URL) {
  console.log('Applying pending Prisma migrations for this deployment environment.');
  runPrisma(['migrate', 'deploy']);
} else {
  console.log('DATABASE_URL is unavailable in this environment; skipping database migrations.');
}

runPrisma(['generate']);
