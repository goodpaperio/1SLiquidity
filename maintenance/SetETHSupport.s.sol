// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Core} from "../src/Core.sol";
import {ETHSupport} from "../src/ETHSupport.sol";

contract SetETHSupport is Script {
    // Mainnet WETH
    address constant WETH_MAINNET = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // v1.0.5 Core (from deployment-addresses-mainnet-1.0.5.json); override with CORE_ADDRESS in .env if needed
    address constant CORE_V1_0_5 = 0x62A1e4DC903F0677Ba4E06494af0a74D8A1205be;

    // Existing ETHSupport (v1.0.4 / reused in v1.0.5); override with ETHSUPPORT_ADDRESS in .env, or set to address(0) to deploy new
    address constant ETHSUPPORT_EXISTING = 0xB970aF8dA1909230a32819602d97a0C0d44C5FB5;

    address public coreAddress;
    address public ethSupportAddress;

    function setUp() public {
        // Core: use CORE_ADDRESS from env if set, otherwise v1.0.5 deployment
        try vm.envAddress("CORE_ADDRESS") returns (address a) {
            coreAddress = a != address(0) ? a : CORE_V1_0_5;
        } catch {
            coreAddress = CORE_V1_0_5;
        }

        // ETHSupport: use ETHSUPPORT_ADDRESS from env if set, otherwise existing deployment (no new deploy)
        try this._readETHSupportEnv() returns (address a) {
            ethSupportAddress = a != address(0) ? a : ETHSUPPORT_EXISTING;
        } catch {
            ethSupportAddress = ETHSUPPORT_EXISTING;
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


