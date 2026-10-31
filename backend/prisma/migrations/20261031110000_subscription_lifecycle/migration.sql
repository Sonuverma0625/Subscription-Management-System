ALTER TABLE "Subscription"
ADD COLUMN "quotationValidUntil" TIMESTAMP(3);

CREATE TABLE "NumberSequence" (
    "key" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("key")
);
