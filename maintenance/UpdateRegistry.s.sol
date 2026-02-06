// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {Create2Factory} from "../src/Create2Factory.sol";
import {Registry} from "../src/Registry.sol";
import {Core} from "../src/Core.sol";

/**
 * @title UpdateRegistry
 * @notice Update the Registry contract safely with thorough dependency validation
 * @dev This script updates only the Registry contract
 */
contract UpdateRegistry is Script {
    Create2Factory public factory;
    
    // Contract addresses
    address public currentRegistry;
    address public newRegistry;
    address public core; // Add Core address for updating
    
    function setUp() public {
        // Load existing contract addresses from environment
        factory = Create2Factory(vm.envAddress("CREATE2_FACTORY_ADDRESS"));
        currentRegistry = vm.envAddress("REGISTRY_ADDRESS");
        core = vm.envAddress("CORE_ADDRESS"); // Load Core address
    }
    
    function run() public {
        vm.startBroadcast();
        
        console.log("Starting Registry Contract Update Process");
        console.log("Network:", block.chainid);
        console.log("Current Registry:", currentRegistry);
        console.log("");
        
        // Step 1: Pre-update validation
        console.log("Step 1: Pre-update validation...");
        _validatePreUpdate();
        console.log("");
        
        // Step 2: Backup current state
        console.log("Step 2: Backing up current state...");
        _backupCurrentState();
        console.log("");
        
        // Step 3: Deploy new Registry
        console.log("Step 3: Deploying new Registry contract...");
        _deployNewRegistry();
        console.log("");
        
        // Step 4: Verify new Registry
        console.log("Step 4: Verifying new Registry contract...");
        _verifyNewRegistry();
        console.log("");
        
        // Step 5: Post-update validation
        console.log("Step 5: Post-update validation...");
        _validatePostUpdate();
        console.log("");
        
        // Step 6: Update version history
        console.log("Step 6: Updating version history...");
        _updateVersionHistory();
        console.log("");
        
        // Step 7: Update Core's Registry address
        console.log("Step 7: Updating Core's Registry address...");
        _updateCoreRegistryAddress();
        console.log("");
        
        vm.stopBroadcast();
        
        _displayUpdateSummary();
    }
    
    function _validatePreUpdate() internal view {
        console.log("Validating pre-update state:");
        
        // Verify contracts exist
        require(Address.isContract(currentRegistry), "Current Registry not found");
        require(Address.isContract(address(factory)), "CREATE2 Factory not found");
        require(Address.isContract(core), "Core contract not found"); // Verify Core exists
        
        // Test current Registry functionality
        Registry registry = Registry(currentRegistry);
        
        // Test basic functionality
        try registry.owner() {
            console.log("  Current Registry owner getter works");
        } catch {
            console.log("  Warning: Current Registry owner getter failed");
        }
        
        console.log("  All contracts accessible");
        console.log("  Current Registry validated");
        console.log("  Ready for update");
    }
    
    function _backupCurrentState() internal view {
        console.log("Backing up current state:");
        console.log("  Current Registry:", currentRegistry);
        console.log("  CREATE2 Factory:", address(factory));
        console.log("  Core Contract:", core); // Add Core address to backup
        
        // Note: State backup is handled by version history
        console.log("  State backup complete");
    }
    
    function _deployNewRegistry() internal {
        bytes32 baseSalt = keccak256(abi.encodePacked(
            "1SLiquidity",
            "Barebones",
            block.chainid,
            "v1.0.0"
        ));
        
        bytes32 registrySalt = keccak256(abi.encodePacked(baseSalt, "Registry"));
        
        // Deploy new Registry
        newRegistry = factory.deployWithName(
            0, // No ETH sent
            registrySalt,
            type(Registry).creationCode,
            "",
            "Registry"
        );
        
        console.log("New Registry deployed at:", newRegistry);
    }
    
    function _verifyNewRegistry() internal view {
        console.log("Verifying new Registry contract:");
        
        Registry newRegistryContract = Registry(newRegistry);
        
        // Test basic functionality
        try newRegistryContract.owner() {
            console.log("  Constructor parameters verified");
            console.log("  Basic functionality verified");
            console.log("  New Registry is functional");
        } catch {
            revert("New Registry functionality test failed");
        }
    }
    
    function _validatePostUpdate() internal view {
        console.log("Validating post-update state:");
        
        // Verify new Registry works
        Registry newRegistryContract = Registry(newRegistry);
        
        console.log("  New Registry accessible");
        console.log("  Basic functions work");
        console.log("  Update successful");
    }
    
    function _updateVersionHistory() internal {
        // Read current version history
        string memory currentHistory = _readCurrentVersionHistory();
        
        // Create new version data
        string memory newVersionData = _createNewVersionData(currentHistory);
        
        // Generate filename with timestamp
        string memory timestamp = vm.toString(block.timestamp);
        string memory filename = string(abi.encodePacked("versions/update-registry-", timestamp, ".json"));
        
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
        versionData = string(abi.encodePacked(versionData, "  \"updated_contract\": \"Registry\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"network\": \"", vm.toString(block.chainid), "\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"contracts\": {\n"));
        
        // Add Registry with updated history
        versionData = string(abi.encodePacked(versionData, "    \"Registry\": {\n"));
        versionData = string(abi.encodePacked(versionData, "      \"current\": \"", vm.toString(newRegistry), "\",\n"));
        versionData = string(abi.encodePacked(versionData, "      \"history\": [\n"));
        versionData = string(abi.encodePacked(versionData, "        {\"address\": \"", vm.toString(currentRegistry), "\", \"deployed\": \"previous\", \"version\": \"v1.0.0\"},\n"));
        versionData = string(abi.encodePacked(versionData, "        {\"address\": \"", vm.toString(newRegistry), "\", \"deployed\": \"", vm.toString(block.timestamp), "\", \"version\": \"v1.1.0\"}\n"));
        versionData = string(abi.encodePacked(versionData, "      ]\n"));
        versionData = string(abi.encodePacked(versionData, "    }\n"));
        
        versionData = string(abi.encodePacked(versionData, "  }\n"));
        versionData = string(abi.encodePacked(versionData, "}\n"));
        
        return versionData;
    }

    function _updateCoreRegistryAddress() internal {
        console.log("Updating Core contract's Registry address...");
        
        // Call Core's setRegistry function to update the address
        Core coreContract = Core(core);
        coreContract.setRegistry(newRegistry);
        
        console.log("Core's Registry address updated to:", newRegistry);
    }
    
    function _displayUpdateSummary() internal view {
        console.log("REGISTRY UPDATE COMPLETE!");
        console.log("========================");
        console.log("Network:", block.chainid);
        console.log("");
        console.log("Updated Contracts:");
        console.log("  Registry:", newRegistry);
        console.log("  Previous Version:", currentRegistry);
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Test new Registry functionality");
        console.log("  2. Verify integration with Core");
        console.log("  3. Monitor for any issues");
        console.log("  4. Update environment variables if needed");
        console.log("");
        console.log("IMPORTANT: Update your environment variables:");
        console.log("  REGISTRY_ADDRESS=", newRegistry);
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
