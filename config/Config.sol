// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "forge-std/console.sol";

/**
 * @title Config
 * @dev Configuration contract that loads token pair addresses from JSON files
 * This contract provides access to token addresses that form pairs with USDC, USDT, WETH, and WBTC
 */
contract Config is Script {
    using stdJson for string;

    struct TokenPair {
        string name;
        address addr; // Changed from tokenAddress to match JSON field "address"
    }

    // Storage for loaded addresses for each base token
    address[] internal _usdcPairAddresses;
    address[] internal _usdtPairAddresses;
    address[] internal _wethPairAddresses;
    address[] internal _wbtcPairAddresses;

    // Global mappings for token names and addresses
    mapping(address => string) internal _tokenNames;
    mapping(string => address) internal _nameToAddress;

    // Loading status for each token
    bool internal _usdcLoaded = false;
    bool internal _usdtLoaded = false;
    bool internal _wethLoaded = false;
    bool internal _wbtcLoaded = false;

    // ===== LOADING FUNCTIONS =====

    /**
     * @dev Load USDC pair addresses from JSON file
     */
    function loadUSDCPairAddresses() public {
        if (_usdcLoaded) {
            return; // Already loaded
        }

        try this.readTokenPairsFromJSON("config/usdc_pairs_clean.json") returns (TokenPair[] memory pairs) {
            console.log("Successfully loaded", pairs.length, "USDC pair addresses from JSON");

            // Clear existing USDC data
            delete _usdcPairAddresses;

            // Store the loaded data
            for (uint256 i = 0; i < pairs.length; i++) {
                address tokenAddress = pairs[i].addr;
                string memory tokenName = pairs[i].name;

                _usdcPairAddresses.push(tokenAddress);
                _tokenNames[tokenAddress] = tokenName;
                _nameToAddress[tokenName] = tokenAddress;
            }

            _usdcLoaded = true;
            console.log("USDC pair addresses loaded successfully");
        } catch Error(string memory reason) {
            console.log("Failed to load USDC addresses from JSON:", reason);
            revert("Failed to load USDC pair addresses from JSON");
        } catch {
            console.log("Failed to load USDC addresses from JSON: Unknown error");
            revert("Failed to load USDC pair addresses from JSON");
        }
    }

    /**
     * @dev Load USDT pair addresses from JSON file
     */
    function loadUSDTPairAddresses() public {
        if (_usdtLoaded) {
            return; // Already loaded
        }

        try this.readTokenPairsFromJSON("config/usdt_pairs_clean.json") returns (TokenPair[] memory pairs) {
            console.log("Successfully loaded", pairs.length, "USDT pair addresses from JSON");

            // Clear existing USDT data
            delete _usdtPairAddresses;

            // Store the loaded data
            for (uint256 i = 0; i < pairs.length; i++) {
                address tokenAddress = pairs[i].addr;
                string memory tokenName = pairs[i].name;

                _usdtPairAddresses.push(tokenAddress);
                _tokenNames[tokenAddress] = tokenName;
                _nameToAddress[tokenName] = tokenAddress;
            }

            _usdtLoaded = true;
            console.log("USDT pair addresses loaded successfully");
        } catch Error(string memory reason) {
            console.log("Failed to load USDT addresses from JSON:", reason);
            revert("Failed to load USDT pair addresses from JSON");
        } catch {
            console.log("Failed to load USDT addresses from JSON: Unknown error");
            revert("Failed to load USDT pair addresses from JSON");
        }
    }

    /**
     * @dev Load WETH pair addresses from JSON file
     */
    function loadWETHPairAddresses() public {
        if (_wethLoaded) {
            return; // Already loaded
        }

        try this.readTokenPairsFromJSON("config/weth_pairs_clean.json") returns (TokenPair[] memory pairs) {
            console.log("Successfully loaded", pairs.length, "WETH pair addresses from JSON");

            // Clear existing WETH data
            delete _wethPairAddresses;

            // Store the loaded data
            for (uint256 i = 0; i < pairs.length; i++) {
                address tokenAddress = pairs[i].addr;
                string memory tokenName = pairs[i].name;

                _wethPairAddresses.push(tokenAddress);
                _tokenNames[tokenAddress] = tokenName;
                _nameToAddress[tokenName] = tokenAddress;
            }

            _wethLoaded = true;
            console.log("WETH pair addresses loaded successfully");
        } catch Error(string memory reason) {
            console.log("Failed to load WETH addresses from JSON:", reason);
            revert("Failed to load WETH pair addresses from JSON");
        } catch {
            console.log("Failed to load WETH addresses from JSON: Unknown error");
            revert("Failed to load WETH pair addresses from JSON");
        }
    }

    /**
     * @dev Load WBTC pair addresses from JSON file
     */
    function loadWBTCPairAddresses() public {
        if (_wbtcLoaded) {
            return; // Already loaded
        }

        try this.readTokenPairsFromJSON("config/wbtc_pairs_clean.json") returns (TokenPair[] memory pairs) {
            console.log("Successfully loaded", pairs.length, "WBTC pair addresses from JSON");

            // Clear existing WBTC data
            delete _wbtcPairAddresses;

            // Store the loaded data
            for (uint256 i = 0; i < pairs.length; i++) {
                address tokenAddress = pairs[i].addr;
                string memory tokenName = pairs[i].name;

                _wbtcPairAddresses.push(tokenAddress);
                _tokenNames[tokenAddress] = tokenName;
                _nameToAddress[tokenName] = tokenAddress;
            }

            _wbtcLoaded = true;
            console.log("WBTC pair addresses loaded successfully");
        } catch Error(string memory reason) {
            console.log("Failed to load WBTC addresses from JSON:", reason);
            revert("Failed to load WBTC pair addresses from JSON");
        } catch {
            console.log("Failed to load WBTC addresses from JSON: Unknown error");
            revert("Failed to load WBTC pair addresses from JSON");
        }
    }

    /**
     * @dev Load all token pair addresses
     */
    function loadAllTokenPairAddresses() public {
        loadUSDCPairAddresses();
        loadUSDTPairAddresses();
        loadWETHPairAddresses();
        loadWBTCPairAddresses();
    }

    /**
     * @dev External function to read token pairs from any JSON file
     * This needs to be external to be callable with try/catch
     */
    function readTokenPairsFromJSON(string memory filePath) external view returns (TokenPair[] memory) {
        // Read the JSON file
        string memory jsonFile = vm.readFile(filePath);

        // Get the total count first
        uint256 totalCount = jsonFile.readUint(".totalCount");

        // Create array to store pairs
        TokenPair[] memory pairs = new TokenPair[](totalCount);

        // Read each pair individually
        for (uint256 i = 0; i < totalCount; i++) {
            string memory basePath = string.concat(".pairs[", vm.toString(i), "]");
            pairs[i].name = jsonFile.readString(string.concat(basePath, ".name"));
            pairs[i].addr = jsonFile.readAddress(string.concat(basePath, ".address"));
        }

        return pairs;
    }

    // ===== GETTER FUNCTIONS FOR USDC =====

    function getUSDCPairAddresses() external view returns (address[] memory) {
        require(_usdcLoaded, "USDC addresses not loaded. Call loadUSDCPairAddresses() first");
        return _usdcPairAddresses;
    }

    function getUSDCPairAddressesCount() external view returns (uint256) {
        require(_usdcLoaded, "USDC addresses not loaded. Call loadUSDCPairAddresses() first");
        return _usdcPairAddresses.length;
    }

    function isUSDCPairAddress(address tokenAddress) external view returns (bool) {
        require(_usdcLoaded, "USDC addresses not loaded. Call loadUSDCPairAddresses() first");
        return _isInArray(_usdcPairAddresses, tokenAddress);
    }

    // ===== GETTER FUNCTIONS FOR USDT =====

    function getUSDTPairAddresses() external view returns (address[] memory) {
        require(_usdtLoaded, "USDT addresses not loaded. Call loadUSDTPairAddresses() first");
        return _usdtPairAddresses;
    }

    function getUSDTPairAddressesCount() external view returns (uint256) {
        require(_usdtLoaded, "USDT addresses not loaded. Call loadUSDTPairAddresses() first");
        return _usdtPairAddresses.length;
    }

    function isUSDTPairAddress(address tokenAddress) external view returns (bool) {
        require(_usdtLoaded, "USDT addresses not loaded. Call loadUSDTPairAddresses() first");
        return _isInArray(_usdtPairAddresses, tokenAddress);
    }

    // ===== GETTER FUNCTIONS FOR WETH =====

    function getWETHPairAddresses() external view returns (address[] memory) {
        require(_wethLoaded, "WETH addresses not loaded. Call loadWETHPairAddresses() first");
        return _wethPairAddresses;
    }

    function getWETHPairAddressesCount() external view returns (uint256) {
        require(_wethLoaded, "WETH addresses not loaded. Call loadWETHPairAddresses() first");
        return _wethPairAddresses.length;
    }

    function isWETHPairAddress(address tokenAddress) external view returns (bool) {
        require(_wethLoaded, "WETH addresses not loaded. Call loadWETHPairAddresses() first");
        return _isInArray(_wethPairAddresses, tokenAddress);
    }

    // ===== GETTER FUNCTIONS FOR WBTC =====

    function getWBTCPairAddresses() external view returns (address[] memory) {
        require(_wbtcLoaded, "WBTC addresses not loaded. Call loadWBTCPairAddresses() first");
        return _wbtcPairAddresses;
    }

    function getWBTCPairAddressesCount() external view returns (uint256) {
        require(_wbtcLoaded, "WBTC addresses not loaded. Call loadWBTCPairAddresses() first");
        return _wbtcPairAddresses.length;
    }

    function isWBTCPairAddress(address tokenAddress) external view returns (bool) {
        require(_wbtcLoaded, "WBTC addresses not loaded. Call loadWBTCPairAddresses() first");
        return _isInArray(_wbtcPairAddresses, tokenAddress);
    }

    // ===== GLOBAL UTILITY FUNCTIONS =====

    /**
     * @dev Get token name by address (works across all loaded tokens)
     */
    function getTokenName(address tokenAddress) external view returns (string memory) {
        return _tokenNames[tokenAddress];
    }

    /**
     * @dev Get token address by name (works across all loaded tokens)
     */
    function getTokenAddress(string calldata tokenName) external view returns (address) {
        return _nameToAddress[tokenName];
    }

    /**
     * @dev Check loading status
     */
    function getLoadingStatus() external view returns (bool usdc, bool usdt, bool weth, bool wbtc) {
        return (_usdcLoaded, _usdtLoaded, _wethLoaded, _wbtcLoaded);
    }

    // ===== INTERNAL HELPER FUNCTIONS =====

    /**
     * @dev Check if an address exists in an array
     */
    function _isInArray(address[] memory array, address target) internal pure returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == target) {
                return true;
            }
        }
        return false;
    }

    // ===== LEGACY COMPATIBILITY FUNCTIONS =====

    /**
     * @dev Legacy function for backward compatibility
     */
    function isLoaded() external view returns (bool) {
        return _usdcLoaded;
    }
}
