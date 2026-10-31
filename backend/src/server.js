import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { startScheduledJobs, stopScheduledJobs } from './jobs/scheduler.js';

let server;

async function start() {
  try {
    await connectDatabase();
    server = app.listen(env.PORT, () => {
      console.log(`Darkside API listening on http://localhost:${env.PORT}`);
      startScheduledJobs();
    });
  } catch (error) {
    console.error('Could not start the API. Check DATABASE_URL and confirm PostgreSQL is running.');
    console.error(error.message);
    process.exitCode = 1;
    await disconnectDatabase();
  }
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down Darkside API.`);
  stopScheduledJobs();
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await disconnectDatabase();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await start();
