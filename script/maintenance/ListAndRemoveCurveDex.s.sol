// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/StreamDaemon.sol";

contract ListAndRemoveCurveDex is Script {
    // V1.0.5 deployment addresses
    address constant STREAM_DAEMON = 0xd35f101Db2EA11693c09851389494d9E297de95C;
    address constant CURVE_META_FETCHER = 0x1406f7b14fE2546Cc6402a44060d11Bb3e356f34;

    function run() external {
        console.log("=== StreamDaemon DEX Configuration ===");
        console.log("StreamDaemon address:", STREAM_DAEMON);
        
        StreamDaemon streamDaemon = StreamDaemon(STREAM_DAEMON);
        
        // List all current DEXs
        console.log("\n--- Current DEXs Registered ---");
        uint256 index = 0;
        while (true) {
            try streamDaemon.dexs(index) returns (address dexAddr) {
                console.log(index, ":", dexAddr);
                
                // Check if it's the Curve fetcher
                if (dexAddr == CURVE_META_FETCHER) {
                    console.log("   ^ THIS IS CURVE META FETCHER");
                }
                
                // Try to get the router for this DEX
                try streamDaemon.dexToRouters(dexAddr) returns (address router) {
                    console.log("      Router:", router);
                } catch {
                    console.log("      Router: none");
                }
                
                index++;
            } catch {
                // Array out of bounds, we've listed all DEXs
                break;
            }
        }
        
        console.log("\nTotal DEXs registered:", index);
        
        // Check if Curve is in the array
        bool curveFound = false;
        for (uint256 i = 0; i < index; i++) {
            try streamDaemon.dexs(i) returns (address dexAddr) {
                if (dexAddr == CURVE_META_FETCHER) {
                    curveFound = true;
                    console.log("\n!!! CURVE META FETCHER FOUND AT INDEX", i);
                    break;
                }
            } catch {}
        }
        
        if (!curveFound) {
            console.log("\nCurve Meta Fetcher NOT found in StreamDaemon");
            return;
        }
        
        console.log("\n=== REMOVING CURVE META FETCHER ===");
        console.log("Address to remove:", CURVE_META_FETCHER);
        console.log("Broadcasting transaction...");
        
        vm.startBroadcast();
        streamDaemon.removeDex(CURVE_META_FETCHER);
        vm.stopBroadcast();
        
        console.log("Curve Meta Fetcher removed successfully!");
        
        // Verify removal
        console.log("\n--- DEXs After Removal ---");
        uint256 newIndex = 0;
        while (true) {
            try streamDaemon.dexs(newIndex) returns (address dexAddr) {
                console.log(newIndex, ":", dexAddr);
                newIndex++;
            } catch {
                break;
            }
        }
        console.log("\nTotal DEXs after removal:", newIndex);
    }
}
