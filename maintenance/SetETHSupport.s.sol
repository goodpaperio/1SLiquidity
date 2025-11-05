// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Core} from "../src/Core.sol";
import {ETHSupport} from "../src/ETHSupport.sol";

contract SetETHSupport is Script {
    // Mainnet WETH
    address constant WETH_MAINNET = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    address public coreAddress;
    address public ethSupportAddress;

    function setUp() public {
        // Required: existing Core address
        coreAddress = vm.envAddress("CORE_ADDRESS");

        // Optional: pre-deployed ETHSupport address (if any)
        // If not provided or 0x0, we will deploy a new ETHSupport
        try this._readETHSupportEnv() returns (address a) {
            ethSupportAddress = a;
        } catch {
            ethSupportAddress = address(0);
        }
    }

    function run() external {
        vm.startBroadcast();

        // Deploy ETHSupport if not provided or not a contract
        if (ethSupportAddress == address(0) || !_isContract(ethSupportAddress)) {
            console.log("ETHSupport not provided/found. Deploying new ETHSupport...");
            ETHSupport newEthSupport = new ETHSupport(WETH_MAINNET, coreAddress);
            ethSupportAddress = address(newEthSupport);
            console.log("ETHSupport deployed at:", ethSupportAddress);
        } else {
            console.log("Using existing ETHSupport at:", ethSupportAddress);
        }

        // Set on Core (owner must be the broadcaster)
        Core core = Core(coreAddress);
        core.setETHSupport(ethSupportAddress);
        console.log("Core.setETHSupport executed.");

        // Basic confirmation logging
        console.log("Core:", coreAddress);
        console.log("ETHSupport:", ethSupportAddress);

        vm.stopBroadcast();

        // Persist a small update file for bookkeeping (best-effort, post-broadcast)
        // Write to cache/ to avoid restricted paths during broadcast
        string memory ts = vm.toString(block.timestamp);
        string memory filename = string(abi.encodePacked("cache/set-ethsupport-", ts, ".json"));
        string memory json = _renderJson(coreAddress, ethSupportAddress);
        try this._write(filename, json) {
            console.log("Wrote:", filename);
        } catch {
            console.log("Note: could not write cache file. Skipping.");
        }
    }

    function _isContract(address a) internal view returns (bool) {
        return a.code.length > 0;
    }

    function _readETHSupportEnv() external view returns (address) {
        return vm.envAddress("ETHSUPPORT_ADDRESS");
    }

    function _write(string memory path, string memory data) external {
        vm.writeFile(path, data);
    }

    function _renderJson(address coreAddr, address ethAddr) internal view returns (string memory) {
        string memory s = "{\n";
        s = string(abi.encodePacked(s, "  \"network\": \"", vm.toString(block.chainid), "\",\n"));
        s = string(abi.encodePacked(s, "  \"core\": \"", vm.toString(coreAddr), "\",\n"));
        s = string(abi.encodePacked(s, "  \"ethSupport\": \"", vm.toString(ethAddr), "\",\n"));
        s = string(abi.encodePacked(s, "  \"timestamp\": \"", vm.toString(block.timestamp), "\"\n"));
        s = string(abi.encodePacked(s, "}\n"));
        return s;
    }
}


