// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Deploys} from "test/shared/Deploys.sol";
import {MockERC20} from "test/mock/MockERC20.sol";
import {AMockFetcher} from "test/mock/MockFetcher.sol";

contract SweetSpotAlgo_Fuzz_Test is Deploys {
    MockERC20 tokenIn;
    MockERC20 tokenOut;
    AMockFetcher mockFetcher;

    function setUp() public override {
        super.setUp();

        // Deploy mock tokens with different decimals
        tokenIn = new MockERC20("Token In", "TKI", 18);
        tokenOut = new MockERC20("Token Out", "TKO", 18);
        
        // Get the first mock fetcher from the deployed DEXes
        mockFetcher = AMockFetcher(dexes[0]);
    }

    // Test fuzz pour les paramètres valides de sweetSpotAlgo
    function testFuzz_SweetSpotAlgo_ValidInputs(uint96 reserveIn, uint96 reserveOut, uint96 volume)
        public
    {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume = bound(uint256(volume), 10 ** 18, type(uint96).max);

        // Set reserves on the mock fetcher
        mockFetcher.setReserves(boundedReserveIn, boundedReserveOut);

        // Appeler la fonction
        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), boundedVolume, address(mockFetcher)
        );

        // Vérifications invariantes
        assertTrue(sweetSpot >= 4, "Sweet spot should be at least 4");
        assertTrue(sweetSpot <= 500, "Sweet spot should be at most 500");
    }

    // Test fuzz pour vérifier le comportement avec des réserves nulles
    function testFuzz_SweetSpotAlgo_ZeroReserves(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 volume
    ) public {
        // Test avec reserveIn = 0
        if (reserveIn == 0 && reserveOut > 0) {
            mockFetcher.setReserves(reserveIn, reserveOut);
            uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
                address(tokenIn), address(tokenOut), volume, address(mockFetcher)
            );
            assertEq(sweetSpot, 4, "Should return fallback sweet spot of 4 for zero reserveIn");
        }

        // Test avec reserveOut = 0
        if (reserveOut == 0 && reserveIn > 0) {
            mockFetcher.setReserves(reserveIn, reserveOut);
            uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
                address(tokenIn), address(tokenOut), volume, address(mockFetcher)
            );
            assertEq(sweetSpot, 4, "Should return fallback sweet spot of 4 for zero reserveOut");
        }

        // Test avec les deux réserves nulles
        if (reserveIn == 0 && reserveOut == 0) {
            mockFetcher.setReserves(reserveIn, reserveOut);
            uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
                address(tokenIn), address(tokenOut), volume, address(mockFetcher)
            );
            assertEq(sweetSpot, 4, "Should return fallback sweet spot of 4 for zero reserves");
        }
    }

    // Test fuzz pour vérifier la monotonie du sweet spot
    function testFuzz_SweetSpotAlgo_Monotonicity(
        uint96 reserveIn,
        uint96 reserveOut,
        uint96 volume1,
        uint96 volume2
    ) public {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume1 = bound(uint256(volume1), 10 ** 18, type(uint96).max);
        uint256 boundedVolume2 = bound(uint256(volume2), 10 ** 18, type(uint96).max);

        // S'assurer que volume1 < volume2
        if (boundedVolume1 >= boundedVolume2) {
            uint256 temp = boundedVolume1;
            boundedVolume1 = boundedVolume2;
            boundedVolume2 = temp;
        }

        // Set reserves on the mock fetcher
        mockFetcher.setReserves(boundedReserveIn, boundedReserveOut);

        uint256 sweetSpot1 = streamDaemon._sweetSpotAlgo(
            address(tokenIn),
            address(tokenOut),
            boundedVolume1,
            address(mockFetcher)
        );

        uint256 sweetSpot2 = streamDaemon._sweetSpotAlgo(
            address(tokenIn),
            address(tokenOut),
            boundedVolume2,
            address(mockFetcher)
        );

        // Avec un volume plus grand, le sweet spot devrait être plus grand
        assertTrue(sweetSpot2 >= sweetSpot1, "Sweet spot should increase with volume");
    }

    // Test fuzz pour vérifier les cas limites (minimum et maximum sweet spot)
    function testFuzz_SweetSpotAlgo_BoundaryConditions(
        uint96 reserveIn,
        uint96 reserveOut,
        uint96 volume
    ) public {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume = bound(uint256(volume), 10 ** 18, type(uint96).max);

        // Set reserves on the mock fetcher
        mockFetcher.setReserves(boundedReserveIn, boundedReserveOut);

        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), boundedVolume, address(mockFetcher)
        );

        // Vérifier les bornes
        assertTrue(sweetSpot >= 4, "Sweet spot should never be less than 4");
        assertTrue(sweetSpot <= 500, "Sweet spot should never be more than 500");

        // Si le sweet spot calculé est 0, il devrait être remplacé par 4
        // Si le sweet spot calculé est < 4, il devrait être remplacé par 4
        // Si le sweet spot calculé est > 500, il devrait être remplacé par 500
    }

    // Test fuzz pour vérifier la cohérence avec différents tokens
    function testFuzz_SweetSpotAlgo_TokenDecimals(
        uint96 reserveIn,
        uint96 reserveOut,
        uint96 volume
    ) public {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume = bound(uint256(volume), 10 ** 18, type(uint96).max);

        // Créer des tokens avec différentes décimales pour tester le scaling
        MockERC20 tokenIn8 = new MockERC20("Token In 8", "TKI8", 8);
        MockERC20 tokenOut12 = new MockERC20("Token Out 12", "TKO12", 12);

        // Set reserves on the mock fetcher
        mockFetcher.setReserves(boundedReserveIn, boundedReserveOut);

        uint256 sweetSpotOriginal = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), boundedVolume, address(mockFetcher)
        );

        uint256 sweetSpotDifferentDecimals = streamDaemon._sweetSpotAlgo(
            address(tokenIn8),
            address(tokenOut12),
            boundedVolume,
            address(mockFetcher)
        );

        // Les sweet spots devraient être dans les mêmes bornes
        assertTrue(sweetSpotOriginal >= 4 && sweetSpotOriginal <= 500, "Original sweet spot out of bounds");
        assertTrue(
            sweetSpotDifferentDecimals >= 4 && sweetSpotDifferentDecimals <= 500,
            "Different decimals sweet spot out of bounds"
        );
    }
}
