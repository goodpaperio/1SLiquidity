-- CreateTable
CREATE TABLE "public"."liquidity_data" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenAAddress" VARCHAR(42) NOT NULL,
    "tokenASymbol" VARCHAR(20) NOT NULL,
    "tokenAName" VARCHAR(100) NOT NULL,
    "tokenADecimals" INTEGER NOT NULL,
    "tokenBAddress" VARCHAR(42) NOT NULL,
    "tokenBSymbol" VARCHAR(20) NOT NULL,
    "tokenBDecimals" INTEGER NOT NULL,
    "marketCap" BIGINT,
    "reservesAUniswapV2" TEXT,
    "reservesBUniswapV2" TEXT,
    "reservesASushiswap" TEXT,
    "reservesBSushiswap" TEXT,
    "reservesAUniswapV3_500" TEXT,
    "reservesBUniswapV3_500" TEXT,
    "reservesAUniswapV3_3000" TEXT,
    "reservesBUniswapV3_3000" TEXT,
    "reservesAUniswapV3_10000" TEXT,
    "reservesBUniswapV3_10000" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidity_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "liquidity_data_tokenAAddress_tokenBAddress_idx" ON "public"."liquidity_data"("tokenAAddress", "tokenBAddress");

-- CreateIndex
CREATE INDEX "liquidity_data_timestamp_idx" ON "public"."liquidity_data"("timestamp");

-- CreateIndex
CREATE INDEX "liquidity_data_tokenAAddress_tokenBAddress_timestamp_idx" ON "public"."liquidity_data"("tokenAAddress", "tokenBAddress", "timestamp");

-- CreateIndex
CREATE INDEX "liquidity_data_marketCap_idx" ON "public"."liquidity_data"("marketCap");

-- CreateIndex
CREATE INDEX "liquidity_data_tokenASymbol_idx" ON "public"."liquidity_data"("tokenASymbol");

-- CreateIndex
CREATE INDEX "liquidity_data_tokenBSymbol_idx" ON "public"."liquidity_data"("tokenBSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "liquidity_data_tokenAAddress_tokenBAddress_timestamp_key" ON "public"."liquidity_data"("tokenAAddress", "tokenBAddress", "timestamp");
