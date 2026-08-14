-- ADR-007: Coupon management system
-- Rollback (down migration): drop Coupon table

DROP TABLE IF EXISTS "Coupon";
