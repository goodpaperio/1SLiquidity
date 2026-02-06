/*
  Warnings:

  - A unique constraint covering the columns `[tokenAAddress,tokenBAddress]` on the table `liquidity_data` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."liquidity_data_tokenAAddress_tokenBAddress_timestamp_key";

-- AlterTable
ALTER TABLE "public"."liquidity_data" ADD COLUMN     "reserveAtotaldepth" DOUBLE PRECISION,
ADD COLUMN     "reserveAtotaldepthWei" TEXT,
ADD COLUMN     "reserveBtotaldepth" DOUBLE PRECISION,
ADD COLUMN     "reserveBtotaldepthWei" TEXT;

-- CreateIndex
CREATE INDEX "liquidity_data_reserveAtotaldepth_idx" ON "public"."liquidity_data"("reserveAtotaldepth");

-- CreateIndex
CREATE INDEX "liquidity_data_reserveBtotaldepth_idx" ON "public"."liquidity_data"("reserveBtotaldepth");

-- CreateIndex
CREATE UNIQUE INDEX "liquidity_data_tokenAAddress_tokenBAddress_key" ON "public"."liquidity_data"("tokenAAddress", "tokenBAddress");
