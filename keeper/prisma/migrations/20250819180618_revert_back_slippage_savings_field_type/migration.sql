/*
  Warnings:

  - The `slippageSavings` column on the `liquidity_data` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."liquidity_data" DROP COLUMN "slippageSavings",
ADD COLUMN     "slippageSavings" DOUBLE PRECISION;
