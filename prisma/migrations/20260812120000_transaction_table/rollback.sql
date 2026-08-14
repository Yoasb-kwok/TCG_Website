-- Rollback for transaction_table migration
-- Run this to reverse the Transaction table changes.
-- WARNING: This will lose all Transaction data.

-- Drop Transaction table
DROP TABLE IF EXISTS "Transaction";

-- Drop enums
DROP TYPE IF EXISTS "TransactionType";
DROP TYPE IF EXISTS "BuyerType";

-- Note: PostgreSQL does not support removing individual values from an enum.
-- The 'FAILED' and 'NOT_REQUIRED' values will remain in "OrderStatus" but are
-- harmless if unused. To fully remove them, you would need to recreate the
-- enum type (complex, not recommended).
