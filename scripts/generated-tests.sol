    // === USDC Tests (71 pairs, 8 chunks of 10) ===

    function test_PlaceTradeWithUSDCTokens_0_10() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_0_10", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 0, 10);
    }

    function test_PlaceTradeWithUSDCTokens_10_20() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_10_20", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 10, 20);
    }

    function test_PlaceTradeWithUSDCTokens_20_30() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_20_30", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 20, 30);
    }

    function test_PlaceTradeWithUSDCTokens_30_40() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_30_40", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 30, 40);
    }

    function test_PlaceTradeWithUSDCTokens_40_50() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_40_50", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 40, 50);
    }

    function test_PlaceTradeWithUSDCTokens_50_60() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_50_60", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 50, 60);
    }

    function test_PlaceTradeWithUSDCTokens_60_70() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_60_70", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 60, 70);
    }

    function test_PlaceTradeWithUSDCTokens_70_71() public {
        address usdc = getTokenByName("usdc");
        _testTradesForTokenRange("USDC_70_71", usdcPairAddresses, usdc, 0x55FE002aefF02F77364de339a1292923A15844B8, formatTokenAmount(usdc, 1000), 70, 71);
    }


    // === USDT Tests (54 pairs, 6 chunks of 10) ===

    function test_PlaceTradeWithUSDTTokens_0_10() public {
        address usdt = getTokenByName("usdt");
        _testTradesForTokenRange("USDT_0_10", usdtPairAddresses, usdt, 0x5754284f345afc66a98fbB0a0Afe71e0F007B949, formatTokenAmount(usdt, 1000), 0, 10);
    }

    function test_PlaceTradeWithUSDTTokens_10_20() public {
        address usdt = getTokenByName("usdt");
        _testTradesForTokenRange("USDT_10_20", usdtPairAddresses, usdt, 0x5754284f345afc66a98fbB0a0Afe71e0F007B949, formatTokenAmount(usdt, 1000), 10, 20);
    }

    function test_PlaceTradeWithUSDTTokens_20_30() public {
        address usdt = getTokenByName("usdt");
        _testTradesForTokenRange("USDT_20_30", usdtPairAddresses, usdt, 0x5754284f345afc66a98fbB0a0Afe71e0F007B949, formatTokenAmount(usdt, 1000), 20, 30);
    }

    function test_PlaceTradeWithUSDTTokens_30_40() public {
        address usdt = getTokenByName("usdt");
        _testTradesForTokenRange("USDT_30_40", usdtPairAddresses, usdt, 0x5754284f345afc66a98fbB0a0Afe71e0F007B949, formatTokenAmount(usdt, 1000), 30, 40);
    }

    function test_PlaceTradeWithUSDTTokens_40_50() public {
        address usdt = getTokenByName("usdt");
        _testTradesForTokenRange("USDT_40_50", usdtPairAddresses, usdt, 0x5754284f345afc66a98fbB0a0Afe71e0F007B949, formatTokenAmount(usdt, 1000), 40, 50);
    }

    function test_PlaceTradeWithUSDTTokens_50_54() public {
        address usdt = getTokenByName("usdt");
        _testTradesForTokenRange("USDT_50_54", usdtPairAddresses, usdt, 0x5754284f345afc66a98fbB0a0Afe71e0F007B949, formatTokenAmount(usdt, 1000), 50, 54);
    }


    // === WETH Tests (99 pairs, 10 chunks of 10) ===

    function test_PlaceTradeWithWETHTokens_0_10() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_0_10", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 0, 10);
    }

    function test_PlaceTradeWithWETHTokens_10_20() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_10_20", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 10, 20);
    }

    function test_PlaceTradeWithWETHTokens_20_30() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_20_30", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 20, 30);
    }

    function test_PlaceTradeWithWETHTokens_30_40() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_30_40", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 30, 40);
    }

    function test_PlaceTradeWithWETHTokens_40_50() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_40_50", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 40, 50);
    }

    function test_PlaceTradeWithWETHTokens_50_60() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_50_60", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 50, 60);
    }

    function test_PlaceTradeWithWETHTokens_60_70() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_60_70", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 60, 70);
    }

    function test_PlaceTradeWithWETHTokens_70_80() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_70_80", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 70, 80);
    }

    function test_PlaceTradeWithWETHTokens_80_90() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_80_90", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 80, 90);
    }

    function test_PlaceTradeWithWETHTokens_90_99() public {
        address weth = getTokenByName("weth");
        _testTradesForTokenRange("WETH_90_99", wethPairAddresses, weth, 0x8EB8a3b98659Cce290402893d0123abb75E3ab28, 5 * 10 ** 17, 90, 99);
    }


    // === WBTC Tests (30 pairs, 3 chunks of 10) ===

    function test_PlaceTradeWithWBTCTokens_0_10() public {
        address wbtc = getTokenByName("wbtc");
        _testTradesForTokenRange("WBTC_0_10", wbtcPairAddresses, wbtc, 0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5, 1 * 10 ** 6, 0, 10);
    }

    function test_PlaceTradeWithWBTCTokens_10_20() public {
        address wbtc = getTokenByName("wbtc");
        _testTradesForTokenRange("WBTC_10_20", wbtcPairAddresses, wbtc, 0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5, 1 * 10 ** 6, 10, 20);
    }

    function test_PlaceTradeWithWBTCTokens_20_30() public {
        address wbtc = getTokenByName("wbtc");
        _testTradesForTokenRange("WBTC_20_30", wbtcPairAddresses, wbtc, 0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5, 1 * 10 ** 6, 20, 30);
    }


