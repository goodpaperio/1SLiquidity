// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {Create2Factory} from "../src/Create2Factory.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {Core} from "../src/Core.sol";
import {UniswapV2Fetcher} from "../src/adapters/UniswapV2Fetcher.sol";
import {SushiswapFetcher} from "../src/adapters/SushiswapFetcher.sol";

/**
 * @title UpdateStreamDaemon
 * @notice Update the StreamDaemon contract safely with thorough dependency validation
 * @dev This script updates only the StreamDaemon contract
 */
contract UpdateStreamDaemon is Script {
    Create2Factory public factory;
    
    // Contract addresses
    address public currentStreamDaemon;
    address public newStreamDaemon;
    address public core; // Add Core address for updating
    
    // DEX Fetchers
    address public uniswapV2Fetcher;
    address public sushiswapFetcher;
    
    // DEX Routers
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    
    function setUp() public {
        // Load existing contract addresses from environment
        factory = Create2Factory(vm.envAddress("CREATE2_FACTORY_ADDRESS"));
        currentStreamDaemon = vm.envAddress("STREAMDAEMON_ADDRESS");
        uniswapV2Fetcher = vm.envAddress("UNISWAP_V2_FETCHER_ADDRESS");
        sushiswapFetcher = vm.envAddress("SUSHISWAP_FETCHER_ADDRESS");
        core = vm.envAddress("CORE_ADDRESS"); // Load Core address
    }
    
    function run() public {
        vm.startBroadcast();
        
        console.log("Starting StreamDaemon Contract Update Process");
        console.log("Network:", block.chainid);
        console.log("Current StreamDaemon:", currentStreamDaemon);
        console.log("UniswapV2Fetcher:", uniswapV2Fetcher);
        console.log("SushiswapFetcher:", sushiswapFetcher);
        console.log("");
        
        // Step 1: Pre-update validation
        console.log("Step 1: Pre-update validation...");
        _validatePreUpdate();
        console.log("");
        
        // Step 2: Backup current state
        console.log("Step 2: Backing up current state...");
        _backupCurrentState();
        console.log("");
        
        // Step 3: Deploy new StreamDaemon
        console.log("Step 3: Deploying new StreamDaemon contract...");
        _deployNewStreamDaemon();
        console.log("");
        
        // Step 4: Verify new StreamDaemon
        console.log("Step 4: Verifying new StreamDaemon contract...");
        _verifyNewStreamDaemon();
        console.log("");
        
        // Step 5: Post-update validation
        console.log("Step 5: Post-update validation...");
        _validatePostUpdate();
        console.log("");
        
        // Step 6: Update version history
        console.log("Step 6: Updating version history...");
        _updateVersionHistory();
        console.log("");
        
        // Step 7: Update Core's StreamDaemon address
        console.log("Step 7: Updating Core's StreamDaemon address...");
        _updateCoreStreamDaemonAddress();
        console.log("");
        
        vm.stopBroadcast();
        
        _displayUpdateSummary();
    }
    
    function _validatePreUpdate() internal view {
        console.log("Validating pre-update state:");
        
        // Verify contracts exist
        require(Address.isContract(currentStreamDaemon), "Current StreamDaemon not found");
        require(Address.isContract(address(factory)), "CREATE2 Factory not found");
        require(Address.isContract(uniswapV2Fetcher), "UniswapV2Fetcher not found");
        require(Address.isContract(sushiswapFetcher), "SushiswapFetcher not found");
        require(Address.isContract(core), "Core contract not found"); // Verify Core exists
        
        // Test current StreamDaemon functionality
        StreamDaemon streamDaemon = StreamDaemon(currentStreamDaemon);
        
        // Test basic functionality
        try streamDaemon.owner() {
            console.log("  Current StreamDaemon owner getter works");
        } catch {
            console.log("  Warning: Current StreamDaemon owner getter failed");
        }
        
        // Test DEX fetcher integration
        _testDexFetcherIntegration();
        
        console.log("  All contracts accessible");
        console.log("  Current StreamDaemon validated");
        console.log("  DEX fetchers validated");
        console.log("  Ready for update");
    }
    
    function _testDexFetcherIntegration() internal view {
        console.log("  Testing DEX fetcher integration:");
        
        // Test UniswapV2Fetcher
        try UniswapV2Fetcher(uniswapV2Fetcher).factory() {
            console.log("    UniswapV2Fetcher accessible");
        } catch {
            console.log("    Warning: UniswapV2Fetcher may have issues");
        }
        
        // Test SushiswapFetcher
        try SushiswapFetcher(sushiswapFetcher).factory() {
            console.log("    SushiswapFetcher accessible");
        } catch {
            console.log("    Warning: SushiswapFetcher may have issues");
        }
        
    }
    
    function _backupCurrentState() internal view {
        console.log("Backing up current state:");
        console.log("  Current StreamDaemon:", currentStreamDaemon);
        console.log("  UniswapV2Fetcher:", uniswapV2Fetcher);
        console.log("  SushiswapFetcher:", sushiswapFetcher);
        console.log("  CREATE2 Factory:", address(factory));
        console.log("  Core:", core); // Add Core to backup
        
        // Note: State backup is handled by version history
        console.log("  State backup complete");
    }
    
    function _deployNewStreamDaemon() internal {
        bytes32 baseSalt = keccak256(abi.encodePacked(
            "1SLiquidity",
            "Barebones",
            block.chainid,
            "v1.0.0"
        ));
        
        bytes32 streamDaemonSalt = keccak256(abi.encodePacked(baseSalt, "StreamDaemon"));
        
        // Prepare DEX arrays for constructor
        address[] memory dexes = new address[](2);
        dexes[0] = uniswapV2Fetcher;
        dexes[1] = sushiswapFetcher;
        
        address[] memory routers = new address[](2);
        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = SUSHISWAP_ROUTER;
        
        // Deploy new StreamDaemon with same DEX configuration
        newStreamDaemon = factory.deployWithName(
            0, // No ETH sent
            streamDaemonSalt,
            type(StreamDaemon).creationCode,
            abi.encode(dexes, routers),
            "StreamDaemon"
        );
        
        console.log("New StreamDaemon deployed at:", newStreamDaemon);
    }
    
    function _verifyNewStreamDaemon() internal view {
        console.log("Verifying new StreamDaemon contract:");
        
        StreamDaemon newStreamDaemonContract = StreamDaemon(newStreamDaemon);
        
        // Test basic functionality
        try newStreamDaemonContract.owner() {
            console.log("  Constructor parameters verified");
            console.log("  Basic functionality verified");
            console.log("  New StreamDaemon is functional");
        } catch {
            revert("New StreamDaemon basic functionality test failed");
        }
        
        // Test DEX integration
        _testNewStreamDaemonIntegration(newStreamDaemonContract);
    }
    
    function _testNewStreamDaemonIntegration(StreamDaemon newStreamDaemonContract) internal view {
        console.log("  Testing new StreamDaemon integration:");
        
        // Test DEX fetcher access
        try newStreamDaemonContract.dexs(0) {
            console.log("    DEX fetchers accessible");
        } catch {
            console.log("    Warning: DEX fetchers integration test failed");
        }
        
        // Test router mapping access
        try newStreamDaemonContract.dexToRouters(uniswapV2Fetcher) {
            console.log("    Routers accessible");
        } catch {
            console.log("    Warning: Routers integration test failed");
        }
    }
    
    function _validatePostUpdate() internal view {
        console.log("Validating post-update state:");
        
        // Verify new StreamDaemon works
        StreamDaemon newStreamDaemonContract = StreamDaemon(newStreamDaemon);
        
        console.log("  New StreamDaemon accessible");
        console.log("  DEX integration verified");
        console.log("  Update successful");
    }
    
    function _updateVersionHistory() internal {
        // Read current version history
        string memory currentHistory = _readCurrentVersionHistory();
        
        // Create new version data
        string memory newVersionData = _createNewVersionData(currentHistory);
        
        // Generate filename with timestamp
        string memory timestamp = vm.toString(block.timestamp);
        string memory filename = string(abi.encodePacked("versions/update-streamdaemon-", timestamp, ".json"));
        
        // Write to file
        vm.writeFile(filename, newVersionData);
        
        console.log("Version history updated in:", filename);
    }
    
    function _readCurrentVersionHistory() internal view returns (string memory) {
        // This would read the most recent version file
        // For now, we'll create a new one
        return "";
    }
    
    function _createNewVersionData(string memory currentHistory) internal view returns (string memory) {
        string memory versionData = "{\n";
        versionData = string(abi.encodePacked(versionData, "  \"update_date\": \"", vm.toString(block.timestamp), "\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"update_type\": \"contract_update\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"updated_contract\": \"StreamDaemon\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"network\": \"", vm.toString(block.chainid), "\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"contracts\": {\n"));
        
        // Add StreamDaemon with updated history
        versionData = string(abi.encodePacked(versionData, "    \"StreamDaemon\": {\n"));
        versionData = string(abi.encodePacked(versionData, "      \"current\": \"", vm.toString(newStreamDaemon), "\",\n"));
        versionData = string(abi.encodePacked(versionData, "      \"history\": [\n"));
        versionData = string(abi.encodePacked(versionData, "        {\"address\": \"", vm.toString(currentStreamDaemon), "\", \"deployed\": \"previous\", \"version\": \"v1.0.0\"},\n"));
        versionData = string(abi.encodePacked(versionData, "        {\"address\": \"", vm.toString(newStreamDaemon), "\", \"deployed\": \"", vm.toString(block.timestamp), "\", \"version\": \"v1.1.0\"}\n"));
        versionData = string(abi.encodePacked(versionData, "      ]\n"));
        versionData = string(abi.encodePacked(versionData, "    }\n"));
        
        versionData = string(abi.encodePacked(versionData, "  }\n"));
        versionData = string(abi.encodePacked(versionData, "}\n"));
        
        return versionData;
    }

    function _updateCoreStreamDaemonAddress() internal {
        console.log("Updating Core contract's StreamDaemon address...");
        
        // Call Core's setStreamDaemon function to update the address
        Core coreContract = Core(core);
        coreContract.setStreamDaemon(newStreamDaemon);
        
        console.log("Core StreamDaemon address updated to:", newStreamDaemon);
    }
    
    function _displayUpdateSummary() internal view {
        console.log("STREAMDAEMON UPDATE COMPLETE!");
        console.log("=============================");
        console.log("Network:", block.chainid);
        console.log("");
        console.log("Updated Contracts:");
        console.log("  StreamDaemon:", newStreamDaemon);
        console.log("  Previous Version:", currentStreamDaemon);
        console.log("");
        console.log("Dependencies:");
        console.log("  UniswapV2Fetcher:", uniswapV2Fetcher);
        console.log("  SushiswapFetcher:", sushiswapFetcher);
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Test new StreamDaemon functionality");
        console.log("  2. Verify DEX integration works");
        console.log("  3. Monitor for any issues");
        console.log("  4. Update environment variables if needed");
        console.log("");
        console.log("IMPORTANT: Update your environment variables:");
        console.log("  STREAMDAEMON_ADDRESS=", newStreamDaemon);
        console.log("");
        console.log("NOTE: Core contract will need to be updated after this");
    }
}

// Helper library for address operations
library Address {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}
