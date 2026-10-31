CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'RAZORPAY');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'FAILED', 'SUCCEEDED');
CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED');

ALTER TABLE "Subscription"
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "pendingPlanId" TEXT;

UPDATE "Subscription" SET "closedAt" = "updatedAt" WHERE "status" = 'CLOSED';

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_pendingPlanId_fkey"
  FOREIGN KEY ("pendingPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "providerOrderId" TEXT,
  ADD COLUMN "providerPaymentId" TEXT;

CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
  "providerOrderId" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "failureReason" TEXT,
  "retryReminderCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentAttempt_providerOrderId_key" ON "PaymentAttempt"("providerOrderId");
CREATE UNIQUE INDEX "PaymentAttempt_providerPaymentId_key" ON "PaymentAttempt"("providerPaymentId");
CREATE INDEX "PaymentAttempt_invoiceId_createdAt_idx" ON "PaymentAttempt"("invoiceId", "createdAt");
CREATE INDEX "PaymentAttempt_status_nextRetryAt_idx" ON "PaymentAttempt"("status", "nextRetryAt");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "dedupeKey" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

CREATE TABLE "DemoRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemoRequest_status_createdAt_idx" ON "DemoRequest"("status", "createdAt");
CREATE INDEX "DemoRequest_email_idx" ON "DemoRequest"("email");

ALTER TABLE "AuditLog" ADD COLUMN "details" JSONB;
