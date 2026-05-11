// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "../../../src/adapters/BalancerV2PoolRegistry.sol";

contract SeedBalancerValidated is Script {
    using stdJson for string;

    function run() external {
        address registryAddr = vm.envAddress("BALANCER_REGISTRY_ADDRESS");
        string memory filePath = vm.envOr("BALANCER_SEED_FILE", string("docs/balancer-seed-candidates.json"));

        string memory jsonFile = vm.readFile(filePath);
        uint256 totalCount = jsonFile.readUint(".totalCount");

        uint256 start = vm.envOr("BALANCER_SEED_START", uint256(0));
        uint256 endExclusive = vm.envOr("BALANCER_SEED_END", totalCount);
        if (endExclusive > totalCount) endExclusive = totalCount;
        require(start < endExclusive, "invalid seed range");

        BalancerV2PoolRegistry registry = BalancerV2PoolRegistry(registryAddr);
        uint256 added;
        uint256 skipped;

        vm.startBroadcast();

        for (uint256 i = start; i < endExclusive; i++) {
            address tokenA = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].tokenA"));
            address tokenB = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].tokenB"));
            address pool = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].pool"));

            if (_poolExists(registry, tokenA, tokenB, pool)) {
                skipped++;
                continue;
            }

            registry.addPool(tokenA, tokenB, pool, true);
            added++;
        }

        vm.stopBroadcast();

        console2.log("Seed file:", filePath);
        console2.log("Range start:", start);
        console2.log("Range end (exclusive):", endExclusive);
        console2.log("Pools added:", added);
        console2.log("Pools skipped (already present):", skipped);
    }

    function _poolExists(BalancerV2PoolRegistry registry, address tokenA, address tokenB, address pool)
        internal
        view
        returns (bool)
    {
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenA, tokenB);
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i].pool == pool) return true;
        }
        return false;
    }
}
