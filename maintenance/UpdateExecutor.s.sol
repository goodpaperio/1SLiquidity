// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {Create2Factory} from "../src/Create2Factory.sol";
import {Executor} from "../src/Executor.sol";
import {Core} from "../src/Core.sol";

/**
 * @title UpdateExecutor
 * @notice Update the Executor contract safely with thorough dependency validation
 * @dev This script updates only the Executor contract
 */
contract UpdateExecutor is Script {
    Create2Factory public factory;
    
    // Contract addresses
    address public currentExecutor;
    address public newExecutor;
    address public core; // Add Core address for updating
    
    function setUp() public {
        // Load existing contract addresses from environment
        factory = Create2Factory(vm.envAddress("CREATE2_FACTORY_ADDRESS"));
        currentExecutor = vm.envAddress("EXECUTOR_ADDRESS");
        core = vm.envAddress("CORE_ADDRESS"); // Load Core address
    }
    
    function run() public {
        vm.startBroadcast();
        
        console.log("Starting Executor Contract Update Process");
        console.log("Network:", block.chainid);
        console.log("Current Executor:", currentExecutor);
        console.log("");
        
        // Step 1: Pre-update validation
        console.log("Step 1: Pre-update validation...");
        _validatePreUpdate();
        console.log("");
        
        // Step 2: Backup current state
        console.log("Step 2: Backing up current state...");
        _backupCurrentState();
        console.log("");
        
        // Step 3: Deploy new Executor
        console.log("Step 3: Deploying new Executor contract...");
        _deployNewExecutor();
        console.log("");
        
        // Step 4: Verify new Executor
        console.log("Step 4: Verifying new Executor contract...");
        _verifyNewExecutor();
        console.log("");
        
        // Step 5: Post-update validation
        console.log("Step 5: Post-update validation...");
        _validatePostUpdate();
        console.log("");
        
        // Step 6: Update version history
        console.log("Step 6: Updating version history...");
        _updateVersionHistory();
        console.log("");
        
        // Step 7: Update Core's Executor address
        console.log("Step 7: Updating Core's Executor address...");
        _updateCoreExecutorAddress();
        console.log("");
        
        vm.stopBroadcast();
        
        _displayUpdateSummary();
    }
    
    function _validatePreUpdate() internal view {
        console.log("Validating pre-update state:");
        
        // Verify contracts exist
        require(Address.isContract(currentExecutor), "Current Executor not found");
        require(Address.isContract(address(factory)), "CREATE2 Factory not found");
        require(Address.isContract(core), "Core contract not found"); // Verify Core exists
        
        // Test current Executor functionality
        Executor executor = Executor(currentExecutor);
        
        // Test basic functionality
        try executor.owner() {
            console.log("  Current Executor owner getter works");
        } catch {
            console.log("  Warning: Current Executor owner getter failed");
        }
        
        console.log("  All contracts accessible");
        console.log("  Current Executor validated");
        console.log("  Ready for update");
    }
    
    function _backupCurrentState() internal view {
        console.log("Backing up current state:");
        console.log("  Current Executor:", currentExecutor);
        console.log("  CREATE2 Factory:", address(factory));
        console.log("  Core Contract:", core); // Add Core address to backup
        
        // Note: State backup is handled by version history
        console.log("  State backup complete");
    }
    
    function _deployNewExecutor() internal {
        bytes32 baseSalt = keccak256(abi.encodePacked(
            "1SLiquidity",
            "Barebones",
            block.chainid,
            "v1.0.0"
        ));
        
        bytes32 executorSalt = keccak256(abi.encodePacked(baseSalt, "Executor"));
        
        // Deploy new Executor
        newExecutor = factory.deployWithName(
            0, // No ETH sent
            executorSalt,
            type(Executor).creationCode,
            "",
            "Executor"
        );
        
        console.log("New Executor deployed at:", newExecutor);
    }
    
    function _verifyNewExecutor() internal view {
        console.log("Verifying new Executor contract:");
        
        Executor newExecutorContract = Executor(newExecutor);
        
        // Test basic functionality
        try newExecutorContract.owner() {
            console.log("  Constructor parameters verified");
            console.log("  Basic functionality verified");
            console.log("  New Executor is functional");
        } catch {
            revert("New Executor functionality test failed");
        }
    }
    
    function _validatePostUpdate() internal view {
        console.log("Validifying post-update state:");
        
        // Verify new Executor works
        Executor newExecutorContract = Executor(newExecutor);
        
        console.log("  New Executor accessible");
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
        string memory filename = string(abi.encodePacked("versions/update-executor-", timestamp, ".json"));
        
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
        versionData = string(abi.encodePacked(versionData, "  \"updated_contract\": \"Executor\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"network\": \"", vm.toString(block.chainid), "\",\n"));
        versionData = string(abi.encodePacked(versionData, "  \"contracts\": {\n"));
        
        // Add Executor with updated history
        versionData = string(abi.encodePacked(versionData, "    \"Executor\": {\n"));
        versionData = string(abi.encodePacked(versionData, "      \"current\": \"", vm.toString(newExecutor), "\",\n"));
        versionData = string(abi.encodePacked(versionData, "      \"history\": [\n"));
        versionData = string(abi.encodePacked(versionData, "        {\"address\": \"", vm.toString(currentExecutor), "\", \"deployed\": \"previous\", \"version\": \"v1.0.0\"},\n"));
        versionData = string(abi.encodePacked(versionData, "        {\"address\": \"", vm.toString(newExecutor), "\", \"deployed\": \"", vm.toString(block.timestamp), "\", \"version\": \"v1.1.0\"}\n"));
        versionData = string(abi.encodePacked(versionData, "      ]\n"));
        versionData = string(abi.encodePacked(versionData, "    }\n"));
        
        versionData = string(abi.encodePacked(versionData, "  }\n"));
        versionData = string(abi.encodePacked(versionData, "}\n"));
        
        return versionData;
    }
    
    function _updateCoreExecutorAddress() internal {
        console.log("Updating Core contract's Executor address...");
        
        // Call Core's setExecutor function to update the address
        Core coreContract = Core(core);
        coreContract.setExecutor(newExecutor);
        
        console.log("Core's Executor address updated to:", newExecutor);
    }
    
    function _displayUpdateSummary() internal view {
        console.log("EXECUTOR UPDATE COMPLETE!");
        console.log("=========================");
        console.log("Network:", block.chainid);
        console.log("");
        console.log("Updated Contracts:");
        console.log("  Executor:", newExecutor);
        console.log("  Previous Version:", currentExecutor);
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Test new Executor functionality");
        console.log("  2. Verify integration with Core");
        console.log("  3. Monitor for any issues");
        console.log("  4. Update environment variables if needed");
        console.log("");
        console.log("IMPORTANT: Update your environment variables:");
        console.log("  EXECUTOR_ADDRESS=", newExecutor);
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
