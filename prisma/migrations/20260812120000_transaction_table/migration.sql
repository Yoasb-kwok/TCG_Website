-- Migration: Transaction table + enums + OrderStatus extension
-- ADR-003: Transaction Management System

-- Extend OrderStatus enum with FAILED and NOT_REQUIRED
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'NOT_REQUIRED';

-- Create TransactionType enum
CREATE TYPE "TransactionType" AS ENUM ('ORDER', 'TOURNAMENT');

-- Create BuyerType enum
CREATE TYPE "BuyerType" AS ENUM ('USER', 'GUEST');

-- Create Transaction table
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "buyerType" "BuyerType" NOT NULL,
    "email" TEXT NOT NULL,
    "customerName" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "receiptData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_buyerType_idx" ON "Transaction"("buyerType");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
CREATE INDEX "Transaction_email_idx" ON "Transaction"("email");
