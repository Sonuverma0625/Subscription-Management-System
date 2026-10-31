import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/db.js';

const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

async function bootstrapAdmin() {
  if (!name || !email || !password) {
    throw new Error('Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD first.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.$transaction(async (transaction) => {
    const existingAdmin = await transaction.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (existingAdmin) return false;

    const existingUser = await transaction.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) throw new Error('That email already belongs to an account.');

    await transaction.user.create({
      data: { name, email, passwordHash, role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    return true;
  }, { isolationLevel: 'Serializable' });

  if (created) console.log('Initial admin account created. Remove the BOOTSTRAP_ADMIN_* environment variables now.');
  else console.log('An admin account already exists; no bootstrap account was created.');
}

try {
  await bootstrapAdmin();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
