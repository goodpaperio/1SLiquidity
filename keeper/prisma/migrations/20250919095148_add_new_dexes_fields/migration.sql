-- AlterTable
ALTER TABLE "public"."liquidity_data" ADD COLUMN     "reservesABalancer" TEXT,
ADD COLUMN     "reservesACurve" TEXT,
ADD COLUMN     "reservesBBalancer" TEXT,
ADD COLUMN     "reservesBCurve" TEXT;
