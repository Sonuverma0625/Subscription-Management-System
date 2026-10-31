CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "companyName" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "companyAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);
