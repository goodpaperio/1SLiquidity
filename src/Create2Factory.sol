// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title Create2Factory
 * @notice Factory contract for deploying contracts using CREATE2 for deterministic addresses
 * @dev Allows deployment of contracts to predictable addresses across different networks
 */
contract Create2Factory {
    event ContractCreated(
        address indexed contractAddress,
        bytes32 indexed salt,
        string contractName,
        uint256 blockNumber,
        uint256 timestamp
    );

    /**
     * @notice Deploy a contract using CREATE2
     * @param amount Amount of ETH to send with deployment
     * @param salt Unique identifier for the deployment
     * @param bytecode Contract bytecode
     * @param constructorArgs Constructor arguments
     * @return deployedAddress Address of the deployed contract
     */
    function deploy(uint256 amount, bytes32 salt, bytes memory bytecode, bytes memory constructorArgs)
        external
        payable
        returns (address deployedAddress)
    {
        require(msg.value >= amount, "Insufficient ETH sent");

        bytes memory deploymentData = abi.encodePacked(bytecode, constructorArgs);

        assembly {
            deployedAddress := create2(amount, add(deploymentData, 0x20), mload(deploymentData), salt)
        }

        require(deployedAddress != address(0), "Create2: Failed on deploy");

        emit ContractCreated(
            deployedAddress,
            salt,
            "Unknown", // Contract name not available at deployment time
            block.number,
            block.timestamp
        );

        return deployedAddress;
    }

    /**
     * @notice Deploy a contract with a name for better logging
     * @param amount Amount of ETH to send with deployment
     * @param salt Unique identifier for the deployment
     * @param bytecode Contract bytecode
     * @param constructorArgs Constructor arguments
     * @param contractName Name of the contract being deployed
     * @return deployedAddress Address of the deployed contract
     */
    function deployWithName(
        uint256 amount,
        bytes32 salt,
        bytes memory bytecode,
        bytes memory constructorArgs,
        string memory contractName
    ) external payable returns (address deployedAddress) {
        require(msg.value >= amount, "Insufficient ETH sent");

        bytes memory deploymentData = abi.encodePacked(bytecode, constructorArgs);

        assembly {
            deployedAddress := create2(amount, add(deploymentData, 0x20), mload(deploymentData), salt)
        }

        require(deployedAddress != address(0), "Create2: Failed on deploy");

        emit ContractCreated(deployedAddress, salt, contractName, block.number, block.timestamp);

        return deployedAddress;
    }

    /**
     * @notice Compute the address where a contract will be deployed
     * @param salt Unique identifier for the deployment
     * @param bytecode Contract bytecode
     * @param constructorArgs Constructor arguments
     * @return computedAddress Address where the contract will be deployed
     */
    function computeAddress(bytes32 salt, bytes memory bytecode, bytes memory constructorArgs)
        external
        view
        returns (address computedAddress)
    {
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(abi.encodePacked(bytecode, constructorArgs)))
        );
        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Compute the address where a contract will be deployed (without constructor args)
     * @param salt Unique identifier for the deployment
     * @param bytecode Contract bytecode
     * @return computedAddress Address where the contract will be deployed
     */
    function computeAddress(bytes32 salt, bytes memory bytecode) external view returns (address computedAddress) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode)));
        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Withdraw any ETH that was sent with deployments
     * @param amount Amount of ETH to withdraw
     */
    function withdraw(uint256 amount) external {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Get the current balance of the factory
     * @return balance Current ETH balance
     */
    function getBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }
}
