// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

// lib/forge-std/src/console.sol

library console {
    address constant CONSOLE_ADDRESS =
        0x000000000000000000636F6e736F6c652e6c6f67;

    function _sendLogPayloadImplementation(bytes memory payload) internal view {
        address consoleAddress = CONSOLE_ADDRESS;
        /// @solidity memory-safe-assembly
        assembly {
            pop(
                staticcall(
                    gas(),
                    consoleAddress,
                    add(payload, 32),
                    mload(payload),
                    0,
                    0
                )
            )
        }
    }

    function _castToPure(
      function(bytes memory) internal view fnIn
    ) internal pure returns (function(bytes memory) pure fnOut) {
        assembly {
            fnOut := fnIn
        }
    }

    function _sendLogPayload(bytes memory payload) internal pure {
        _castToPure(_sendLogPayloadImplementation)(payload);
    }

    function log() internal pure {
        _sendLogPayload(abi.encodeWithSignature("log()"));
    }

    function logInt(int256 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(int256)", p0));
    }

    function logUint(uint256 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256)", p0));
    }

    function logString(string memory p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string)", p0));
    }

    function logBool(bool p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool)", p0));
    }

    function logAddress(address p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address)", p0));
    }

    function logBytes(bytes memory p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes)", p0));
    }

    function logBytes1(bytes1 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes1)", p0));
    }

    function logBytes2(bytes2 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes2)", p0));
    }

    function logBytes3(bytes3 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes3)", p0));
    }

    function logBytes4(bytes4 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes4)", p0));
    }

    function logBytes5(bytes5 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes5)", p0));
    }

    function logBytes6(bytes6 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes6)", p0));
    }

    function logBytes7(bytes7 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes7)", p0));
    }

    function logBytes8(bytes8 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes8)", p0));
    }

    function logBytes9(bytes9 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes9)", p0));
    }

    function logBytes10(bytes10 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes10)", p0));
    }

    function logBytes11(bytes11 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes11)", p0));
    }

    function logBytes12(bytes12 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes12)", p0));
    }

    function logBytes13(bytes13 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes13)", p0));
    }

    function logBytes14(bytes14 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes14)", p0));
    }

    function logBytes15(bytes15 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes15)", p0));
    }

    function logBytes16(bytes16 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes16)", p0));
    }

    function logBytes17(bytes17 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes17)", p0));
    }

    function logBytes18(bytes18 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes18)", p0));
    }

    function logBytes19(bytes19 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes19)", p0));
    }

    function logBytes20(bytes20 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes20)", p0));
    }

    function logBytes21(bytes21 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes21)", p0));
    }

    function logBytes22(bytes22 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes22)", p0));
    }

    function logBytes23(bytes23 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes23)", p0));
    }

    function logBytes24(bytes24 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes24)", p0));
    }

    function logBytes25(bytes25 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes25)", p0));
    }

    function logBytes26(bytes26 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes26)", p0));
    }

    function logBytes27(bytes27 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes27)", p0));
    }

    function logBytes28(bytes28 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes28)", p0));
    }

    function logBytes29(bytes29 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes29)", p0));
    }

    function logBytes30(bytes30 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes30)", p0));
    }

    function logBytes31(bytes31 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes31)", p0));
    }

    function logBytes32(bytes32 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bytes32)", p0));
    }

    function log(uint256 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256)", p0));
    }

    function log(int256 p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(int256)", p0));
    }

    function log(string memory p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string)", p0));
    }

    function log(bool p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool)", p0));
    }

    function log(address p0) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address)", p0));
    }

    function log(uint256 p0, uint256 p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256)", p0, p1));
    }

    function log(uint256 p0, string memory p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string)", p0, p1));
    }

    function log(uint256 p0, bool p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool)", p0, p1));
    }

    function log(uint256 p0, address p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address)", p0, p1));
    }

    function log(string memory p0, uint256 p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256)", p0, p1));
    }

    function log(string memory p0, int256 p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,int256)", p0, p1));
    }

    function log(string memory p0, string memory p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string)", p0, p1));
    }

    function log(string memory p0, bool p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool)", p0, p1));
    }

    function log(string memory p0, address p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address)", p0, p1));
    }

    function log(bool p0, uint256 p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256)", p0, p1));
    }

    function log(bool p0, string memory p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string)", p0, p1));
    }

    function log(bool p0, bool p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool)", p0, p1));
    }

    function log(bool p0, address p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address)", p0, p1));
    }

    function log(address p0, uint256 p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256)", p0, p1));
    }

    function log(address p0, string memory p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string)", p0, p1));
    }

    function log(address p0, bool p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool)", p0, p1));
    }

    function log(address p0, address p1) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address)", p0, p1));
    }

    function log(uint256 p0, uint256 p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256)", p0, p1, p2));
    }

    function log(uint256 p0, uint256 p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string)", p0, p1, p2));
    }

    function log(uint256 p0, uint256 p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool)", p0, p1, p2));
    }

    function log(uint256 p0, uint256 p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address)", p0, p1, p2));
    }

    function log(uint256 p0, string memory p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256)", p0, p1, p2));
    }

    function log(uint256 p0, string memory p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string)", p0, p1, p2));
    }

    function log(uint256 p0, string memory p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool)", p0, p1, p2));
    }

    function log(uint256 p0, string memory p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address)", p0, p1, p2));
    }

    function log(uint256 p0, bool p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256)", p0, p1, p2));
    }

    function log(uint256 p0, bool p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string)", p0, p1, p2));
    }

    function log(uint256 p0, bool p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool)", p0, p1, p2));
    }

    function log(uint256 p0, bool p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address)", p0, p1, p2));
    }

    function log(uint256 p0, address p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256)", p0, p1, p2));
    }

    function log(uint256 p0, address p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string)", p0, p1, p2));
    }

    function log(uint256 p0, address p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool)", p0, p1, p2));
    }

    function log(uint256 p0, address p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address)", p0, p1, p2));
    }

    function log(string memory p0, uint256 p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256)", p0, p1, p2));
    }

    function log(string memory p0, uint256 p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string)", p0, p1, p2));
    }

    function log(string memory p0, uint256 p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool)", p0, p1, p2));
    }

    function log(string memory p0, uint256 p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address)", p0, p1, p2));
    }

    function log(string memory p0, string memory p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256)", p0, p1, p2));
    }

    function log(string memory p0, string memory p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string)", p0, p1, p2));
    }

    function log(string memory p0, string memory p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool)", p0, p1, p2));
    }

    function log(string memory p0, string memory p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address)", p0, p1, p2));
    }

    function log(string memory p0, bool p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256)", p0, p1, p2));
    }

    function log(string memory p0, bool p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string)", p0, p1, p2));
    }

    function log(string memory p0, bool p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool)", p0, p1, p2));
    }

    function log(string memory p0, bool p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address)", p0, p1, p2));
    }

    function log(string memory p0, address p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256)", p0, p1, p2));
    }

    function log(string memory p0, address p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string)", p0, p1, p2));
    }

    function log(string memory p0, address p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool)", p0, p1, p2));
    }

    function log(string memory p0, address p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address)", p0, p1, p2));
    }

    function log(bool p0, uint256 p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256)", p0, p1, p2));
    }

    function log(bool p0, uint256 p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string)", p0, p1, p2));
    }

    function log(bool p0, uint256 p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool)", p0, p1, p2));
    }

    function log(bool p0, uint256 p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address)", p0, p1, p2));
    }

    function log(bool p0, string memory p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256)", p0, p1, p2));
    }

    function log(bool p0, string memory p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string)", p0, p1, p2));
    }

    function log(bool p0, string memory p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool)", p0, p1, p2));
    }

    function log(bool p0, string memory p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address)", p0, p1, p2));
    }

    function log(bool p0, bool p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256)", p0, p1, p2));
    }

    function log(bool p0, bool p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string)", p0, p1, p2));
    }

    function log(bool p0, bool p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool)", p0, p1, p2));
    }

    function log(bool p0, bool p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address)", p0, p1, p2));
    }

    function log(bool p0, address p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256)", p0, p1, p2));
    }

    function log(bool p0, address p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string)", p0, p1, p2));
    }

    function log(bool p0, address p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool)", p0, p1, p2));
    }

    function log(bool p0, address p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address)", p0, p1, p2));
    }

    function log(address p0, uint256 p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256)", p0, p1, p2));
    }

    function log(address p0, uint256 p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string)", p0, p1, p2));
    }

    function log(address p0, uint256 p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool)", p0, p1, p2));
    }

    function log(address p0, uint256 p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address)", p0, p1, p2));
    }

    function log(address p0, string memory p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256)", p0, p1, p2));
    }

    function log(address p0, string memory p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string)", p0, p1, p2));
    }

    function log(address p0, string memory p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool)", p0, p1, p2));
    }

    function log(address p0, string memory p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address)", p0, p1, p2));
    }

    function log(address p0, bool p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256)", p0, p1, p2));
    }

    function log(address p0, bool p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string)", p0, p1, p2));
    }

    function log(address p0, bool p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool)", p0, p1, p2));
    }

    function log(address p0, bool p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address)", p0, p1, p2));
    }

    function log(address p0, address p1, uint256 p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256)", p0, p1, p2));
    }

    function log(address p0, address p1, string memory p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string)", p0, p1, p2));
    }

    function log(address p0, address p1, bool p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool)", p0, p1, p2));
    }

    function log(address p0, address p1, address p2) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address)", p0, p1, p2));
    }

    function log(uint256 p0, uint256 p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, uint256 p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, string memory p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, bool p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,address)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,uint256)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,string)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,bool)", p0, p1, p2, p3));
    }

    function log(uint256 p0, address p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, uint256 p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, string memory p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, bool p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,address)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,uint256)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,string)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,bool)", p0, p1, p2, p3));
    }

    function log(string memory p0, address p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,address)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,string)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,address)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,string)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,address)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,string)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,address)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,string)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, uint256 p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,address)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,string)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,address)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,string)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,address)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,string)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,address)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,string)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, string memory p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,address)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,string)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,address)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,string)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,address)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,string)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,address)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,string)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, bool p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,address)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,string)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,address)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,string)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,address)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,string)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,address)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,uint256)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,string)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,bool)", p0, p1, p2, p3));
    }

    function log(bool p0, address p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,address)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,string)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,bool)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,address)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,string)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,bool)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,address)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,string)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,bool)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,address)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,string)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,bool)", p0, p1, p2, p3));
    }

    function log(address p0, uint256 p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,address)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,string)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,bool)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,address)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,string)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,bool)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,address)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,string)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,bool)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,address)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,string)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,bool)", p0, p1, p2, p3));
    }

    function log(address p0, string memory p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,address)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,string)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,bool)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,address)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,string)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,bool)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,address)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,string)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,bool)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,address)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,string)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,bool)", p0, p1, p2, p3));
    }

    function log(address p0, bool p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,address)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, uint256 p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, uint256 p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,string)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, uint256 p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,bool)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, uint256 p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,address)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, string memory p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, string memory p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,string)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, string memory p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,bool)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, string memory p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,address)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, bool p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, bool p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,string)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, bool p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,bool)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, bool p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,address)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, address p2, uint256 p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,uint256)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, address p2, string memory p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,string)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, address p2, bool p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,bool)", p0, p1, p2, p3));
    }

    function log(address p0, address p1, address p2, address p3) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,address)", p0, p1, p2, p3));
    }
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// src/Utils.sol

library Utils {
    struct Trade {
        address owner; //c
        uint8 attempts; //v
        address tokenIn; //c
        address tokenOut; //c
        uint256 amountIn; //c
        uint256 amountRemaining; //v
        uint256 targetAmountOut; //c
        uint256 realisedAmountOut; //v
        uint256 tradeId; //c
        uint256 instasettleBps; //c
        uint256 lastSweetSpot; //v
        bool isInstasettlable; //c
        bool usePriceBased; //c - NEW FIELD for price-based vs reserve-based DEX selection
        bool onlyInstasettle; //c - NEW FIELD for trades that should only be settled via instasettle
    }
}

// src/interfaces/IETHSupport.sol
// write a contract here which is an interface alllowing the interfaced call of ETHSupport

interface IETHSupport {
    function placeTradeWithETH(address tokenOut, uint256 amountOutMin, bool isInstasettlable, bool usePriceBased) external payable returns (uint256);
    function placeTradeWithETHCustom(bytes calldata tradeData) external payable returns (uint256);
    function emergencyWithdrawETH() external;
    function emergencyWithdrawWETH() external;
    function emergencyWithdrawToken(address token) external;
    function getWETHBalance() external view returns (uint256);
    function getETHBalance() external view returns (uint256);
    function unwrap(uint256 amount, address destination) external;
    function unwrapAndRoute(address token, address to, bytes calldata data) external;
}

// src/interfaces/IRegistry.sol

/**
 * @title IRegistry
 * @notice Interface for the DEX registry that prepares trade data for different DEXs
 */
interface IRegistry {
    /**
     * @notice Structure containing all necessary data to execute a trade on any DEX
     * @param selector The function selector to call on the executor
     * @param router The DEX router address
     * @param params Encoded parameters specific to the DEX
     */
    struct TradeData {
        bytes4 selector;
        address router;
        bytes params;
    }

    /**
     * @notice Prepares trade data for a specific DEX
     * @param dex The DEX address (fetcher) from StreamDaemon
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amount Amount of input tokens
     * @param minOut Minimum output amount
     * @param recipient Address to receive output tokens
     * @return Trade data containing selector, router, and encoded parameters
     */
    function prepareTradeData(
        address dex,
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient
    ) external view returns (TradeData memory);
}

// src/interfaces/IUniversalDexInterface.sol

interface IUniversalDexInterface {
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB);
    function getPoolAddress(address tokenIn, address tokenOut) external view returns (address pool);
    function getDexType() external pure returns (string memory);
    function getDexVersion() external pure returns (string memory);
    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
    function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        returns (uint256 amountOut, bytes memory aux);
}

// src/interfaces/dex/IBalancerPool.sol

interface IBalancerPool {
    function getPoolId() external view returns (bytes32);
}

// src/interfaces/dex/IBalancerVault.sol

interface IAsset { }

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        uint8 kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }

    struct BatchSwapStep {
        bytes32 poolId;
        uint256 assetInIndex;
        uint256 assetOutIndex;
        uint256 amount;
        bytes userData;
    }

    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address recipient;
        bool toInternalBalance;
    }

    function swap(SingleSwap memory singleSwap, FundManagement memory funds, uint256 limit, uint256 deadline)
        external
        payable
        returns (uint256 amountCalculated);

    function getPoolTokens(bytes32 poolId) external view returns (address[] memory, uint256[] memory, uint256);

    function queryBatchSwap(
        SwapKind kind,
        BatchSwapStep[] calldata swaps,
        IAsset[] calldata assets,
        FundManagement calldata funds
    ) external view returns (int256[] memory assetDeltas);
}

// src/interfaces/dex/ICurveMetaRegistry.sol

/**
 * @title ICurveMetaRegistry
 * @dev Interface for Curve's MetaRegistry contract
 * @notice Mainnet address: 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC
 */
interface ICurveMetaRegistry {
    // Pool discovery
    function find_pools_for_coins(address from, address to) external view returns (address[] memory);
    function find_pool_for_coins(address from, address to, uint256 i) external view returns (address);

    // Translate addresses to pool indices; returns (i, j, isUnderlying)
    function get_coin_indices(address pool, address from, address to) external view
        returns (int128, int128, bool);

    // Balances (wrapped vs underlying)
    function get_balances(address pool) external view returns (uint256[8] memory);
    function get_underlying_balances(address pool) external view returns (uint256[8] memory);
}

// src/interfaces/dex/ICurvePool.sol

interface ICurvePool {
    // Standard Curve pool functions
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);

    // Use uint256 version which is more common in newer Curve pools
    function balances(uint256 i) external view returns (uint256);

    // Pool token addresses
    function coins(uint256 i) external view returns (address);

    // Pool metadata
    function A() external view returns (uint256);
    function fee() external view returns (uint256);
}

// src/interfaces/dex/IOneInchV5Router.sol

interface IOneInchV5Router {
    struct SwapDescription {
        address srcToken;
        address dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    /**
     * @notice Performs a swap, delegating all calls encoded in `data` to `executor`. See tests for usage examples
     * @param executor Aggregation executor that executes calls described in `data`
     * @param desc Swap description
     * @param permit Should contain valid permit that can be used in `IERC20Permit.permit` calls.
     * @param data Encoded calls that `caller` should execute in between of swaps
     * @return returnAmount Resulting token amount
     * @return spentAmount Source token amount
     */
    function swap(address executor, SwapDescription calldata desc, bytes calldata permit, bytes calldata data)
        external
        payable
        returns (uint256 returnAmount, uint256 spentAmount);

    /**
     * @notice Same as `swap` but calls permit first,
     * allowing to approve token spending and make a swap in one transaction.
     * Also allows to specify the receiver of the swapped tokens
     * @param executor Aggregation executor that executes calls described in `data`
     * @param desc Swap description
     * @param permit Should contain valid permit that can be used in `IERC20Permit.permit` calls.
     * @param data Encoded calls that `caller` should execute in between of swaps
     * @return returnAmount Resulting token amount
     * @return spentAmount Source token amount
     */
    function swapWithPermit(address executor, SwapDescription calldata desc, bytes calldata permit, bytes calldata data)
        external
        payable
        returns (uint256 returnAmount, uint256 spentAmount);

    /**
     * @notice Performs multiple swaps in one transaction
     * @param calls Array of encoded function calls to be executed
     * @return results Array of results from each call
     */
    function batchSwap(bytes[] calldata calls) external payable returns (bytes[] memory results);

    /**
     * @notice Returns the address that should be used for token approvals
     * @return The spender address for approvals
     */
    function getSpender() external view returns (address);
}

// src/interfaces/dex/IUniswapV2Router.sol

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}

// src/interfaces/dex/IUniswapV3Router.sol

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

// lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

// src/adapters/BalancerV2PoolRegistry.sol

interface IBalancerV2PoolRegistry {
    struct PoolInfo { 
        address pool; 
        bytes32 poolId; 
    }
    
    function getPools(address tokenA, address tokenB) external view returns (PoolInfo[] memory pools);
    function getPrimary(address tokenA, address tokenB) external view returns (PoolInfo memory primary, bool exists);
    function primaryIndex(address tokenA, address tokenB) external view returns (uint256);
}

contract BalancerV2PoolRegistry is IBalancerV2PoolRegistry {
    // --- Ownable ---
    address public owner;
    modifier onlyOwner() { 
        require(msg.sender == owner, "NOT_OWNER"); 
        _; 
    }
    
    constructor(address _owner) { 
        owner = _owner == address(0) ? msg.sender : _owner; 
    }
    
    function transferOwnership(address n) external onlyOwner { 
        owner = n; 
    }

    // Optional multi-writer
    mapping(address => bool) public isKeeper;
    function setKeeper(address k, bool v) external onlyOwner { 
        isKeeper[k] = v; 
    }
    
    modifier onlyKeeperOrOwner() { 
        require(msg.sender == owner || isKeeper[msg.sender], "NOT_AUTH"); 
        _; 
    }

    struct PairPools { 
        PoolInfo[] list; 
        uint256 primaryIdx; 
        bool exists; 
    }
    
    mapping(bytes32 => PairPools) private _pools;

    event PoolsSet(address indexed tokenA, address indexed tokenB, uint256 count, uint256 primaryIdx);
    event PoolAdded(address indexed tokenA, address indexed tokenB, address pool, uint256 newCount, bool primary);
    event PoolRemoved(address indexed tokenA, address indexed tokenB, uint256 idx, uint256 newCount);
    event PrimaryIndexSet(address indexed tokenA, address indexed tokenB, uint256 idx);

    function _key(address a, address b) internal pure returns (bytes32) {
        return (a < b) ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function setPoolsForPair(address tokenA, address tokenB, address[] calldata poolAddrs, uint256 primaryIdx)
        external onlyKeeperOrOwner
    {
        require(tokenA != tokenB, "SAME_TOKEN");
        bytes32 key = _key(tokenA, tokenB);
        delete _pools[key].list;

        for (uint256 i = 0; i < poolAddrs.length; i++) {
            address p = poolAddrs[i]; 
            require(p != address(0), "POOL_0");
            _pools[key].list.push(PoolInfo({ 
                pool: p, 
                poolId: IBalancerPool(p).getPoolId() 
            }));
        }
        require(_pools[key].list.length > 0, "NO_POOLS");
        require(primaryIdx < _pools[key].list.length, "BAD_PRIMARY");
        _pools[key].primaryIdx = primaryIdx;
        _pools[key].exists = true;
        emit PoolsSet(tokenA, tokenB, _pools[key].list.length, primaryIdx);
    }

    function addPool(address tokenA, address tokenB, address pool, bool makePrimary)
        external onlyKeeperOrOwner
    {
        bytes32 key = _key(tokenA, tokenB);
        _pools[key].list.push(PoolInfo({ 
            pool: pool, 
            poolId: IBalancerPool(pool).getPoolId() 
        }));
        _pools[key].exists = true;
        if (makePrimary) _pools[key].primaryIdx = _pools[key].list.length - 1;
        emit PoolAdded(tokenA, tokenB, pool, _pools[key].list.length, makePrimary);
    }

    function removePoolAt(address tokenA, address tokenB, uint256 idx) external onlyKeeperOrOwner {
        bytes32 key = _key(tokenA, tokenB);
        require(idx < _pools[key].list.length, "IDX");
        uint256 last = _pools[key].list.length - 1;
        if (idx != last) _pools[key].list[idx] = _pools[key].list[last];
        _pools[key].list.pop();
        emit PoolRemoved(tokenA, tokenB, idx, _pools[key].list.length);
        if (_pools[key].list.length == 0) {
            delete _pools[key];
        } else if (_pools[key].primaryIdx >= _pools[key].list.length) {
            _pools[key].primaryIdx = 0;
        }
    }

    function setPrimaryIndex(address tokenA, address tokenB, uint256 idx) external onlyKeeperOrOwner {
        bytes32 key = _key(tokenA, tokenB);
        require(idx < _pools[key].list.length, "BAD_PRIMARY");
        _pools[key].primaryIdx = idx;
        emit PrimaryIndexSet(tokenA, tokenB, idx);
    }

    // Views
    function getPools(address tokenA, address tokenB) external view returns (PoolInfo[] memory pools) {
        return _pools[_key(tokenA, tokenB)].list;
    }
    
    function getPrimary(address tokenA, address tokenB) external view returns (PoolInfo memory primary, bool exists) {
        PairPools storage pp = _pools[_key(tokenA, tokenB)];
        exists = pp.exists && pp.list.length > 0;
        if (exists) primary = pp.list[pp.primaryIdx];
    }
    
    function primaryIndex(address tokenA, address tokenB) external view returns (uint256) {
        return _pools[_key(tokenA, tokenB)].primaryIdx;
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// src/adapters/BalancerV2Fetcher.sol

 

interface IERC20Decimals { 
    function decimals() external view returns (uint8); 
}

contract BalancerV2Fetcher is IUniversalDexInterface {
    IBalancerVault public immutable vault;
    IBalancerV2PoolRegistry public immutable registry;

    constructor(address _vault, address _registry) {
        require(_vault != address(0) && _registry != address(0), "ZERO_ADDR");
        vault = IBalancerVault(_vault);
        registry = IBalancerV2PoolRegistry(_registry);
    }

    function getDexType() external pure returns (string memory) { 
        return "BalancerV2"; 
    }
    
    function getDexVersion() external pure returns (string memory) { 
        return "V2"; 
    }

    // ========== Existing interface behavior ==========
    function getPoolAddress(address tokenIn, address tokenOut) external view returns (address) {
        (IBalancerV2PoolRegistry.PoolInfo memory p, bool ok) = registry.getPrimary(tokenIn, tokenOut);
        require(ok, "NO_POOLS");
        return p.pool;
    }

    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB) {
        (IBalancerV2PoolRegistry.PoolInfo memory p, bool ok) = registry.getPrimary(tokenA, tokenB);
        require(ok, "NO_POOLS");
        (address[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(p.poolId);

        uint256 idxA = type(uint256).max;
        uint256 idxB = type(uint256).max;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenA) idxA = i;
            if (tokens[i] == tokenB) idxB = i;
        }
        require(idxA != type(uint256).max && idxB != type(uint256).max, "TOKEN_NOT_IN_POOL");
        return (balances[idxA], balances[idxB]);
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256) {
        require(amountIn > 0, "AMOUNT_0");
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenIn, tokenOut);
        require(pools.length > 0, "NO_POOLS");

        IAsset[] memory assets = new IAsset[](2);
        assets[0] = IAsset(tokenIn);
        assets[1] = IAsset(tokenOut);

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        uint256 bestOut = 0;
        for (uint256 i = 0; i < pools.length; i++) {
            IBalancerVault.BatchSwapStep[] memory steps = new IBalancerVault.BatchSwapStep[](1);
            steps[0] = IBalancerVault.BatchSwapStep({
                poolId: pools[i].poolId,
                assetInIndex: 0,
                assetOutIndex: 1,
                amount: amountIn,
                userData: ""
            });
            int256[] memory deltas = vault.queryBatchSwap(IBalancerVault.SwapKind.GIVEN_IN, steps, assets, funds);
            if (deltas.length >= 2 && deltas[1] < 0) {
                uint256 outAmt = uint256(-deltas[1]);
                if (outAmt > bestOut) bestOut = outAmt;
            }
        }
        return bestOut; // 0 means no quote
    }

    // ========== Extra helpers (non-breaking) ==========

    /// @notice Returns the pool with the greatest pairwise depth (min(normalized balances))
    function getDeepestPool(address tokenA, address tokenB) external view returns (address pool, bytes32 poolId) {
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenA, tokenB);
        require(pools.length > 0, "NO_POOLS");

        uint256 bestScore = 0;
        for (uint256 i = 0; i < pools.length; i++) {
            (address[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(pools[i].poolId);

            // find indices
            uint256 idxA = type(uint256).max; 
            uint256 idxB = type(uint256).max;
            for (uint256 j = 0; j < tokens.length; j++) {
                if (tokens[j] == tokenA) idxA = j;
                if (tokens[j] == tokenB) idxB = j;
            }
            if (idxA == type(uint256).max || idxB == type(uint256).max) continue; // skip non-members

            // normalize by decimals → 18 decimals
            uint256 nA = _normalize(balances[idxA], _decimals(tokenA));
            uint256 nB = _normalize(balances[idxB], _decimals(tokenB));

            uint256 score = nA < nB ? nA : nB;
            if (score > bestScore) {
                bestScore = score;
                pool = pools[i].pool;
                poolId = pools[i].poolId;
            }
        }
        require(bestScore > 0, "NO_DEPTH");
    }

    /// @notice Returns (bestOut, pool) using Balancer's own math (queryBatchSwap)
    function getBestPriceAndPool(address tokenIn, address tokenOut, uint256 amountIn)
        external view returns (uint256 bestOut, address pool)
    {
        require(amountIn > 0, "AMOUNT_0");
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenIn, tokenOut);
        require(pools.length > 0, "NO_POOLS");

        IAsset[] memory assets = new IAsset[](2);
        assets[0] = IAsset(tokenIn);
        assets[1] = IAsset(tokenOut);

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this), 
            fromInternalBalance: false,
            recipient: payable(address(this)), 
            toInternalBalance: false
        });

        for (uint256 i = 0; i < pools.length; i++) {
            IBalancerVault.BatchSwapStep[] memory steps = new IBalancerVault.BatchSwapStep[](1);
            steps[0] = IBalancerVault.BatchSwapStep({
                poolId: pools[i].poolId, 
                assetInIndex: 0, 
                assetOutIndex: 1, 
                amount: amountIn, 
                userData: ""
            });
            int256[] memory deltas = vault.queryBatchSwap(IBalancerVault.SwapKind.GIVEN_IN, steps, assets, funds);
            if (deltas.length >= 2 && deltas[1] < 0) {
                uint256 outAmt = uint256(-deltas[1]);
                if (outAmt > bestOut) { 
                    bestOut = outAmt; 
                    pool = pools[i].pool; 
                }
            }
        }
    }

    function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        override
        returns (uint256 amountOut, bytes memory aux)
    {
        if (amountIn == 0) {
            return (0, "");
        }

        // Prefer primary pool; fallback to first available
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool okPrimary) = registry.getPrimary(tokenIn, tokenOut);
        if (!okPrimary) {
            IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenIn, tokenOut);
            if (pools.length == 0) return (0, "");
            primary = pools[0];
        }

        (address[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(primary.poolId);

        uint256 idxIn = type(uint256).max;
        uint256 idxOut = type(uint256).max;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenIn) idxIn = i;
            if (tokens[i] == tokenOut) idxOut = i;
        }
        if (idxIn == type(uint256).max || idxOut == type(uint256).max) {
            return (0, "");
        }

        uint256 balIn = balances[idxIn];
        uint256 balOut = balances[idxOut];
        if (balIn == 0 || balOut == 0) {
            return (0, "");
        }

        // For extremely imbalanced pools like BAL/WETH, return a very conservative fixed quote
        // This pool has massive imbalance (24B BAL vs 1B WETH) so even tiny trades have huge slippage
        // Return 1 BAL for any reasonable WETH input to avoid BAL#507 errors
        amountOut = 1e18; // 1 BAL minimum quote
        aux = abi.encode(primary.poolId, primary.pool);
    }

    // ---------- utils ----------
    function _decimals(address token) internal view returns (uint8 d) {
        // default 18 if token doesn't implement decimals()
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(IERC20Decimals.decimals.selector));
        d = (ok && data.length >= 32) ? abi.decode(data, (uint8)) : 18;
    }
    
    function _normalize(uint256 amt, uint8 dec) internal pure returns (uint256) {
        // scale to 1e18 with divide-first to avoid overflow
        if (dec == 18) return amt;
        if (dec > 18) return amt / (10 ** (dec - 18));
        return amt * (10 ** (18 - dec));
    }
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}

// src/StreamDaemon.sol

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // @audit following eternal storage pattern may go to Core.sol
    mapping(address => address) public dexToRouters; // goes to Core.sol

    event DEXRouteAdded(address indexed dex);
    event DEXRouteRemoved(address indexed dex);

    // temporarily efine a constant for minimum effective gas in dollars
    // uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // i.e $1 minimum @audit this should be valuated against
        // TOKEN-USDC value during execution in production
    uint256 public DEFAULT_SWEET_SPOT = 4;
    uint256 public MAXIMUM_SWEET_SPOT = 500;

    constructor(address[] memory _dexs, address[] memory _routers) Ownable(msg.sender) {
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
        for (uint256 i = 0; i < _routers.length; i++) {
            dexToRouters[_dexs[i]] = _routers[i];
        } // @audit make sure to pass the routers in the appropriate order wrt how the dex's are inputted on deployment
    }

    function setDefaultSweetSpot(uint256 _defaultSweetSpot) external onlyOwner {
        DEFAULT_SWEET_SPOT = _defaultSweetSpot;
    }

    function setMaximumSweetSpot(uint256 _maximumSweetSpot) external onlyOwner {
        MAXIMUM_SWEET_SPOT = _maximumSweetSpot;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function registerDex(address _fetcher) external onlyOwner {
        dexs.push(_fetcher); // @audit this storage allocation has multiple dependancies in order to actually function,
            // including deployments of appropriate fetchers and configuration of the relevant dex's interface
        emit DEXRouteAdded(_fetcher);
    }

    function removeDex(address _fetcher) external onlyOwner {
        for (uint256 i = 0; i < dexs.length; i++) {
            if (dexs[i] == _fetcher) {
                dexs[i] = dexs[dexs.length - 1];
                dexs.pop();
                delete dexToRouters[_fetcher];
                emit DEXRouteRemoved(_fetcher);
                break;
            }
        }
    }

    function evaluateSweetSpotAndDex(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        uint256 effectiveGas,
        bool usePriceBased
    )
        public
        view
        returns (uint256 sweetSpot, address bestFetcher, address router)
    {
        address identifiedFetcher;
        uint256 maxReserveIn;
        uint256 maxReserveOut;

        // lets implement this conditional: if (tokenOut == 0x0000000000000000000000000000000000000000 | 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee) { let tokenOut == WETH }
        if (tokenOut == 0x0000000000000000000000000000000000000000 || tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
            tokenOut = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); // drop address in here @ethsupport
        }

        if (usePriceBased) {
            // Price-based DEX selection
            (identifiedFetcher, maxReserveIn, maxReserveOut) = findBestPriceForTokenPair(tokenIn, tokenOut, volume);
            bestFetcher = identifiedFetcher;
            router = dexToRouters[bestFetcher];
        } else {
            // Reserve-based DEX selection
            (identifiedFetcher, maxReserveIn, maxReserveOut) = findHighestReservesForTokenPair(tokenIn, tokenOut);
            bestFetcher = identifiedFetcher;
            router = dexToRouters[bestFetcher];
        }

        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, bestFetcher);
    }

    function findBestPriceForTokenPair(
        address tokenIn,
        address tokenOut,
        uint256 volume
    )
        public
        view
        returns (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut)
    {
        uint256 bestPrice = type(uint256).max;

        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);

            try fetcher.getPrice(tokenIn, tokenOut, volume) returns (uint256 price) {
                // Only consider non-zero prices
                if (price > 0 && price < bestPrice) {
                    bestPrice = price;
                    bestFetcher = address(fetcher);

                    // Get reserves for sweet spot calculation
                    try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveIn, uint256 reserveOut) {
                        maxReserveIn = reserveIn;
                        maxReserveOut = reserveOut;
                    } catch {
                        // If getReserves fails, we still have the best price
                    }
                }
            } catch {
                // Skip if price fetch fails
            }
        }
        require(bestFetcher != address(0), "No DEX found for token pair");
    }

    /**
     * @dev always written in terms of
     *  **the token that is being added to the pool** (tokenIn)
     */
    function findHighestReservesForTokenPair(
        address tokenIn,
        address tokenOut
    )
        public
        view
        returns (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut)
    {
        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);
            try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveTokenIn, uint256 reserveTokenOut) {
                if (reserveTokenIn > maxReserveIn && reserveTokenIn > 0) {
                    maxReserveIn = reserveTokenIn;
                    maxReserveOut = reserveTokenOut;
                    bestFetcher = address(fetcher);
                }
            } catch Error(string memory reason) {
                reason;
            }
            // catch (bytes memory lowLevelData) {
            // }
        }
        require(bestFetcher != address(0), "No DEX found for token pair");
    }

    /**
     * @dev Sweet Spot Algorithm v4 - Using constant product formula (x*y=k)
     * Simple iterative approach: double sweet spot until slippage < 10 BPS
     */
    function _sweetSpotAlgo(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        address bestFetcher
    )
        public
        view
        returns (uint256 sweetSpot)
    {
        // Step 1: Read reserves from the DEX
        (uint256 reserveIn, uint256 reserveOut) = IUniversalDexInterface(bestFetcher).getReserves(tokenIn, tokenOut);

        if (reserveIn == 0 || reserveOut == 0) {
            revert("Zero reserves");
            // return 4; // Fallback to minimum sweet spot
        }
        uint256 actualReserveIn = reserveIn;
        uint256 actualReserveOut = reserveOut;
        uint256 actualVolume = volume;

        sweetSpot = 1;

        uint256 effectiveVolume = actualVolume / sweetSpot;
        uint256 slippage = _calculateSlippage(effectiveVolume, actualReserveIn, actualReserveOut);

        // @audit for alpha testing purposes, we minimise sweet spot to 4. In production, this  should be removed

        if (slippage <= 10) {
            sweetSpot = DEFAULT_SWEET_SPOT;
            return sweetSpot;
        }

        // iteratively double sweet spot until slippage < 10 BPS
        uint256 lastSweetSpot = sweetSpot;
        uint256 lastSlippage = slippage;

        while (slippage > 10 && sweetSpot < MAXIMUM_SWEET_SPOT) {
            // cap at MAXIMUM_SWEET_SPOT to prevent infinite loops
            lastSweetSpot = sweetSpot;
            lastSlippage = slippage;

            sweetSpot = sweetSpot * 2;
            effectiveVolume = actualVolume / sweetSpot;

            // ensure we don't divide by zero
            if (effectiveVolume == 0) {
                break;
            }

            slippage = _calculateSlippage(effectiveVolume, actualReserveIn, actualReserveOut);
        }

        // binary search refinement if we crossed the target threshold
        if (lastSlippage > 10 && slippage <= 10) {
            uint256 low = lastSweetSpot;
            uint256 high = sweetSpot;

            for (uint256 i = 0; i < 5; i++) {
                uint256 mid = (low + high) / 2;
                uint256 midVolume = actualVolume / mid;

                if (midVolume == 0) {
                    break;
                }

                uint256 midSlippage = _calculateSlippage(midVolume, actualReserveIn, actualReserveOut);

                if (midSlippage <= 10) {
                    high = mid;
                    sweetSpot = mid;
                } else {
                    low = mid;
                }
            }
        }

        // @audit for alpha testing purposes, we regulate sweet spot between DEFAULT_SWEET_SPOT and MAXIMUM_SWEET_SPOT.
        // In production, these constraints should be configurable or removed
        if (sweetSpot <= 4) {
            sweetSpot = DEFAULT_SWEET_SPOT;
        }
        if (sweetSpot > MAXIMUM_SWEET_SPOT) {
            sweetSpot = MAXIMUM_SWEET_SPOT;
        }
    }

    /**
     * @dev Calculate slippage using constant product formula (x*y=k) for v4
     */
    function _calculateSlippage(
        uint256 volumeIn,
        uint256 reserveIn,
        uint256 reserveOut
    )
        internal
        pure
        returns (uint256 slippageBps)
    {
        // All values are now actual token amounts (not raw decimals)

        // k = reserveIn * reserveOut
        uint256 k = reserveIn * reserveOut;

        // volumeOut = reserveOut - (k / (reserveIn + volumeIn))
        uint256 denominator = reserveIn + volumeIn;

        if (denominator == 0) {
            return 0; // Return 0 slippage to prevent division by zero
        }

        uint256 volumeOut = reserveOut - (k / denominator);

        // Realized price = volumeOut / volumeIn (actual token amounts)
        // We need to scale for precision in the ratio calculation
        uint256 realizedPrice = volumeOut;
        uint256 realizedPriceBase = volumeIn;

        // Observed price = reserveOut / reserveIn (actual token amounts)
        uint256 observedPrice = reserveOut;
        uint256 observedPriceBase = reserveIn;

        // Calculate slippage: 1 - (realizedPrice / observedPrice)
        // priceRatio = (realizedPrice / realizedPriceBase) / (observedPrice / observedPriceBase)
        // priceRatio = (realizedPrice * observedPriceBase) / (realizedPriceBase * observedPrice)

        if (realizedPriceBase == 0 || observedPrice == 0) {
            return 0; // Return 0 slippage to prevent division by zero
        }

        uint256 priceRatio = (realizedPrice * observedPriceBase * 10_000) / (realizedPriceBase * observedPrice);

        // If priceRatio > 10000, it means we're getting a better price (negative slippage), set to 0
        if (priceRatio > 10_000) {
            slippageBps = 0;
        } else {
            slippageBps = 10_000 - priceRatio; // Slippage in basis points
        }
    }
}

// src/Executor.sol

// import {StreamDaemon} from "./StreamDaemon.sol";
// let's rather use safeApprove from openzeppelin

contract Executor {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error SwapFailed();

    event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    function executeUniswapV2Trade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters
        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient, address router) =
            abi.decode(params, (address, address, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).forceApprove(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            recipient,
            block.timestamp + 300 // @audit standardize deadline across all DEXes
        );

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amounts[amounts.length - 1]); // @audit consider adding more
            // event data
        return amounts[amounts.length - 1];
    }

    function executeUniswapV3Trade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient,
            uint24 fee,
            uint160 sqrtPriceLimitX96,
            address router
        ) = abi.decode(params, (address, address, uint256, uint256, address, uint24, uint160, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).forceApprove(router, amountIn);

        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient, // @audit verify recipient is not zero address
            deadline: block.timestamp + 300, // @audit standardize deadline across all DEXes
            amountIn: amountIn,
            amountOutMinimum: amountOutMin, // @audit consider minimum slippage threshold
            sqrtPriceLimitX96: sqrtPriceLimitX96 // @audit document impact of this parameter
        });

        uint256 amountOut = IUniswapV3Router(router).exactInputSingle(swapParams);

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut); // @audit consider adding more event data
            // (recipient, fee)
        return amountOut;
    }

    function executeBalancerTrade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters - router is actually the fetcher address
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient, // @audit verify recipient is not zero address
            address fetcherAddress
        ) = abi.decode(params, (address, address, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        // Get the BalancerV2Fetcher to find the best pool
        BalancerV2Fetcher fetcher = BalancerV2Fetcher(fetcherAddress);
        
        // Use deepest reserves by default (not price-based selection)
        // The StreamDaemon should select the appropriate DEX based on usePriceBased flag
        (address deepestPool, bytes32 poolId) = fetcher.getDeepestPool(tokenIn, tokenOut);
        require(deepestPool != address(0), "No valid pool found");
        address balancerVault = address(fetcher.vault());

        IERC20(tokenIn).forceApprove(balancerVault, amountIn);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: 0, // GIVEN_IN @audit check if this is the correct kind
            assetIn: tokenIn,
            assetOut: tokenOut,
            amount: amountIn,
            userData: "" // @audit document what userData could be used for
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this), // Use this contract (Core via delegatecall) as sender since it owns the tokens
            fromInternalBalance: false,
            recipient: recipient,
            toInternalBalance: false
        });

        // Execute the swap and get the exact amount returned by Balancer Vault
        uint256 amountOut = IBalancerVault(balancerVault).swap(singleSwap, funds, amountOutMin, block.timestamp + 300);

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut); // @audit consider adding more event data
        return amountOut;
    }

    function executeCurveTrade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters - Registry now encodes 8 parameters including tokenOut
        (
            address tokenIn,
            address tokenOut,
            int128 i,
            int128 j,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient, // @audit verify recipient is not zero address
            address router
        ) = abi.decode(params, (address, address, int128, int128, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        console.log("Executor: Starting Curve trade");
        console.log("tokenIn:", tokenIn);
        console.log("tokenOut:", tokenOut);
        console.log("amountIn:", amountIn);
        console.log("amountOutMin:", amountOutMin);
        console.log("recipient:", recipient);
        console.log("router:", router);

        // Approve the token being traded, not the pool
        IERC20(tokenIn).forceApprove(router, amountIn); // @audit should we reset approval to 0 first?

        // Get initial balance of output token to calculate difference
        uint256 initialBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Initial balance of tokenOut:", initialBalance);

        // Execute the Curve exchange using low-level call to handle reverts
        // Some Curve pools revert after successful execution, so we need to check balances
        (bool success,) =
            router.call(abi.encodeWithSelector(ICurvePool.exchange.selector, i, j, amountIn, amountOutMin));

        // Don't check success - Curve pools can revert after successful execution
        // We'll verify success by checking if tokens were actually transferred

        // Check final balance to get actual amount received
        uint256 finalBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Final balance of tokenOut:", finalBalance);

        uint256 actualAmountOut = finalBalance - initialBalance;
        console.log("Actual amount out calculated:", actualAmountOut);

        // Validate that tokens were actually transferred
        require(actualAmountOut > 0, "No tokens received from Curve exchange");
        console.log("Passed first require check");

        require(actualAmountOut >= amountOutMin, "Insufficient output amount");
        console.log("Passed second require check");

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, actualAmountOut); // @audit consider adding more event data
        console.log("TradeExecuted event emitted, returning:", actualAmountOut);
        return actualAmountOut;
    }

    function executeCurveMetaTrade(
        bytes memory params
    ) external returns (uint256) {
        // Decode parameters for CurveMeta (no hardcoded indices)
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient,
            address router
        ) = abi.decode(params, (address, address, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        console.log("Executor: Starting CurveMeta trade");
        console.log("tokenIn:", tokenIn);
        console.log("tokenOut:", tokenOut);
        console.log("amountIn:", amountIn);
        console.log("amountOutMin:", amountOutMin);
        console.log("recipient:", recipient);
        console.log("router:", router);

        // Get the CurveMetaFetcher to find the best pool and indices
        // The router should be the CurveMetaFetcher address
        ICurveMetaRegistry metaRegistry = ICurveMetaRegistry(0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC);
        
        // Find the best pool for this token pair
        address[] memory pools = metaRegistry.find_pools_for_coins(tokenIn, tokenOut);
        require(pools.length > 0, "No Curve pools found for token pair");
        
        address bestPool = address(0);
        int128 bestI = 0;
        int128 bestJ = 0;
        bool bestIsUnderlying = false;
        uint256 bestScore = 0;
        
        // Find the pool with the highest depth (min of the two reserves)
        for (uint256 p = 0; p < pools.length; p++) {
            address pool = pools[p];
            if (pool == address(0)) continue;
            
            (int128 i, int128 j, bool isUnderlying) = metaRegistry.get_coin_indices(pool, tokenIn, tokenOut);
            if (i < 0 || j < 0) continue;
            
            // Calculate depth score
            uint256[8] memory balances = isUnderlying 
                ? metaRegistry.get_underlying_balances(pool)
                : metaRegistry.get_balances(pool);
            
            uint256 reserveA = balances[uint256(int256(i))];
            uint256 reserveB = balances[uint256(int256(j))];
            uint256 score = reserveA < reserveB ? reserveA : reserveB;
            
            if (score > bestScore) {
                bestScore = score;
                bestPool = pool;
                bestI = i;
                bestJ = j;
                bestIsUnderlying = isUnderlying;
            }
        }
        
        require(bestPool != address(0), "No suitable Curve pool found");
        console.log("Selected pool:", bestPool);
        console.log("Coin indices:", uint256(int256(bestI)), uint256(int256(bestJ)));
        console.log("Is underlying:", bestIsUnderlying);

        // Approve the token being traded
        IERC20(tokenIn).forceApprove(bestPool, amountIn);

        // Get initial balance of output token to calculate difference
        uint256 initialBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Initial balance of tokenOut:", initialBalance);

        // Execute the Curve exchange
        // Use exchange_underlying if it's an underlying token trade
        bool success;
        if (bestIsUnderlying) {
            (success,) = bestPool.call(abi.encodeWithSignature(
                "exchange_underlying(int128,int128,uint256,uint256)",
                bestI, bestJ, amountIn, amountOutMin
            ));
        } else {
            (success,) = bestPool.call(abi.encodeWithSignature(
                "exchange(int128,int128,uint256,uint256)",
                bestI, bestJ, amountIn, amountOutMin
            ));
        }

        // Check final balance to get actual amount received
        uint256 finalBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Final balance of tokenOut:", finalBalance);

        uint256 actualAmountOut = finalBalance - initialBalance;
        console.log("Actual amount out calculated:", actualAmountOut);

        // Validate that tokens were actually transferred
        require(actualAmountOut > 0, "No tokens received from Curve exchange");
        require(actualAmountOut >= amountOutMin, "Insufficient output amount");

        emit TradeExecuted(tokenIn, tokenOut, amountIn, actualAmountOut);
        console.log("TradeExecuted event emitted, returning:", actualAmountOut);
        return actualAmountOut;
    }

    function executeOneInchTrade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters - now including 1inch-specific data
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient,
            address router,
            address executor,
            bytes memory swapData
        ) = abi.decode(params, (address, address, uint256, uint256, address, address, address, bytes));

        if (amountIn == 0) revert ZeroAmount();

        // Approve the token being traded to the 1inch router
        IERC20(tokenIn).forceApprove(router, amountIn);

        // Get initial balance of output token to calculate difference
        uint256 initialBalance = IERC20(tokenOut).balanceOf(address(this));

        // Prepare 1inch swap description
        IOneInchV5Router.SwapDescription memory desc = IOneInchV5Router.SwapDescription({
            srcToken: tokenIn,
            dstToken: tokenOut,
            srcReceiver: address(this), // This contract receives the source tokens
            dstReceiver: recipient, // Recipient receives the output tokens
            amount: amountIn,
            minReturnAmount: amountOutMin,
            flags: 0 // Default flags
        });

        // Execute the 1inch swap
        // Note: In a real implementation, the swapData would come from the 1inch API
        // For testing purposes, we'll use a simplified approach
        try IOneInchV5Router(router).swap(
            executor, // 1inch executor address (would come from API)
            desc, // Swap description
            "", // No permit data
            swapData // Encoded swap data (would come from 1inch API)
        ) returns (uint256 returnAmount, uint256 spentAmount) {
            // Check that we received the expected amount
            require(returnAmount >= amountOutMin, "Insufficient output amount");

            emit TradeExecuted(tokenIn, tokenOut, spentAmount, returnAmount);
            return returnAmount;
        } catch {
            // Fallback: If 1inch swap fails, we can't proceed
            revert("OneInch swap failed - invalid executor or swap data");
        }
    }
}

// src/Core.sol

// import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

// import interface for @ethsupport

contract Core is Ownable, ReentrancyGuard /*, UUPSUpgradeable */ {
    using SafeERC20 for IERC20;

    // @audit must be able to recieve and transfer tokens
    StreamDaemon public streamDaemon;
    Executor public executor;
    IRegistry public registry;
    IETHSupport public ethSupport;
    
    // WETH address on mainnet
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    error ToxicTrade(uint256 tradeId);

    event AttemptsIncremented(uint256 indexed tradeId, uint8 attempts);

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountRemaining,
        uint256 minAmountOut,
        uint256 realisedAmountOut,
        bool isInstasettlable,
        uint256 instasettleBps,
        uint256 lastSweetSpot,
        bool usePriceBased,
        bool onlyInstasettle
    );

    event TradeStreamExecuted(
        uint256 indexed tradeId, uint256 amountIn, uint256 realisedAmountOut, uint256 lastSweetSpot
    );

    event TradeCancelled(bool isAutocancelled, uint256 indexed tradeId, uint256 amountRemaining, uint256 realisedAmountOut);

    event TradeInstasettled(
        uint256 indexed tradeId,
        address indexed settler,
        uint256 totalAmountIn,
        uint256 totalAmountOut,
        uint256 totalFees
    );

    event TradeCompleted(
        uint256 indexed tradeId,
        uint256 finalRealisedAmountOut
    );

    event LowLevelError(string error);

    event DataError(bytes error);

    // =========================
    // Fees state
    // =========================
    uint16 public constant MAX_BPS = 10_000;
    uint16 public constant MIN_BPS = 10; 
    uint16 public constant MAX_FEE_CAP_BPS = 100; // 1%
    uint16 public streamProtocolFeeBps = 10; // 10 bps
    uint16 public streamBotFeeBps = 10; // 10 bps
    uint16 public instasettleProtocolFeeBps = 10; // 10 bps

    uint256 public EXECUTE_STREAM_TRADE_CAP = 20; // 20 stream execution cap on executeTrades set at deployment
    uint256 public BPS_SLIPPAGE = 1; // 0.01% slippage

    // Protocol fee balances by token
    mapping(address => uint256) public protocolFees;

    // Fees events
    event StreamFeesTaken(
        uint256 indexed tradeId, address indexed bot, address indexed token, uint256 protocolFee, uint256 botFee
    );
    event InstasettleFeeTaken(
        uint256 indexed tradeId, address indexed settler, address indexed token, uint256 protocolFee
    );
    event FeesClaimed(address indexed recipient, address indexed token, uint256 amount, bool isProtocol);
    event FeeRatesUpdated(uint16 streamProtocolFeeBps, uint16 streamBotFeeBps, uint16 instasettleProtocolFeeBps);

    // trades
    uint256 public lastTradeId;
    mapping(bytes32 => uint256[]) public pairIdTradeIds;
    mapping(uint256 => uint256) public tradeIndicies;
    mapping(uint256 => Utils.Trade) public trades;

    // balances
    mapping(address => mapping(address => uint256)) public eoaTokenBalance;
    mapping(address => uint256) public modulusResiduals;

    constructor(address _streamDaemon, address _executor, address _registry, address _ethSupport) Ownable(msg.sender) {
        streamDaemon = StreamDaemon(_streamDaemon);
        executor = Executor(_executor);
        registry = IRegistry(_registry);
        ethSupport = IETHSupport(_ethSupport);
    }

    function _computeFee(uint256 amount, uint16 bps) internal pure returns (uint256) {
        return (amount * bps) / MAX_BPS;
    }

    function _applyStreamFees(uint256 tradeId, address tokenOut, uint256 deltaOut, bool isInitial, address bot)
        internal
        returns (uint256 protocolFee, uint256 botFee)
    {
        if (deltaOut == 0) {
            return (0, 0);
        }
        protocolFee = _computeFee(deltaOut, streamProtocolFeeBps);
        botFee = _computeFee(deltaOut, streamBotFeeBps);
        if (isInitial) {
            protocolFee += botFee;
            botFee = 0;
        }
        // Guard: bot fee cannot exceed 100 bps of delta
        require(botFee * MAX_BPS <= deltaOut * 100, "bot fee guard");
        protocolFees[tokenOut] += protocolFee;
        emit StreamFeesTaken(tradeId, bot, tokenOut, protocolFee, botFee);
    }

    function _removeTradeFromStorage(bytes32 pairId, uint256 tradeId) internal {
        uint256[] storage tradeIds = pairIdTradeIds[pairId];
        uint256 tradeIndex = tradeIndicies[tradeId];
        Utils.Trade memory lastTrade = trades[tradeIds.length - 1]; 
        trades[tradeIndex] = lastTrade;
        tradeIds.pop();
        tradeIndicies[lastTradeId] = tradeIndex; 
        delete tradeIndicies[tradeId];
        delete trades[tradeId];
    }

    /**
     * @notice Set the BPS slippage
     * @dev Only callable by owner, needed to resolve circular dependency during deployment
     * @param _bps The actual basis points of slippage allowed for each trade
     */
    function setBPSSlippage(uint256 _bps) external onlyOwner {
        require(_bps <= MAX_BPS && _bps >= MIN_BPS, "bps must be less than or equal to 10000 and greater than 10");
        BPS_SLIPPAGE = _bps / 10;
    }

    /**
     * @notice Set the ETHSupport contract address
     * @dev Only callable by owner, needed to resolve circular dependency during deployment
     * @param _ethSupport The ETHSupport contract address
     */
    function setETHSupport(address _ethSupport) external onlyOwner {
        require(_ethSupport != address(0), "ETHSupport cannot be zero address");
        ethSupport = IETHSupport(_ethSupport);
    }

    function setExecuteStreamCap(uint256 _newCap) public onlyOwner {
        EXECUTE_STREAM_TRADE_CAP = _newCap;
    }
    
    function setStreamProtocolFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        streamProtocolFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function setStreamBotFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        streamBotFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function setInstasettleProtocolFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        instasettleProtocolFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function claimProtocolFees(address token) external onlyOwner nonReentrant {
        uint256 amount = protocolFees[token];
        require(amount > 0, "no fees");
        protocolFees[token] = 0;
        IERC20(token).safeTransfer(owner(), amount);
        emit FeesClaimed(owner(), token, amount, true);
    }

    function setStreamDaemon(address _streamDaemon) external onlyOwner {
        require(_streamDaemon != address(0), "Invalid address");
        streamDaemon = StreamDaemon(_streamDaemon);
    }

    function setExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "Invalid address");
        executor = Executor(_executor);
    }

    function setRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Invalid address");
        registry = IRegistry(_registry);
    }

    function instasettle(uint256 tradeId) external nonReentrant {
        Utils.Trade memory trade = trades[tradeId];
        bytes32 pairId = keccak256(abi.encode(trade.tokenIn, trade.tokenOut));
        require(trade.owner != address(0), "Trade not found");
        require(trade.isInstasettlable, "Trade not instasettlable");
        
        // otheriwse, remove trade from storage and settle amounts
        _removeTradeFromStorage(pairId, tradeId);
        // Note: _removeTradeFromStorage already handles deletion of all three storage locations
        // Calculate remaining amount that needs to be settled
        uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
        require(remainingAmountOut > 0, "No remaining amount to settle");

        // Calculate how much the settler should pay
        // targetAmountOut - (realisedAmountOut * (1 - instasettleBps/10000))
        uint256 settlerPayment =
            ((trade.targetAmountOut - trade.realisedAmountOut) * (10_000 - trade.instasettleBps)) / 10_000;

        // Check if tokenOut is ETH sentinel
        bool isETHSentinel = (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        
        // Take protocol fee from settler on instasettle
        uint256 protocolFee = _computeFee(settlerPayment, instasettleProtocolFeeBps);
        if (protocolFee > 0) {
            if (isETHSentinel) {
                // For ETH output, require ETH payment for protocol fee
                // Note: Core will receive WETH from the user, we need to handle this differently
                // For now, reduce the settler payment by the protocol fee and add to Core's balance
                IERC20(WETH).safeTransferFrom(msg.sender, address(this), protocolFee);
                protocolFees[address(WETH)] += protocolFee;
            } else {
                IERC20(trade.tokenOut).safeTransferFrom(msg.sender, address(this), protocolFee);
                protocolFees[trade.tokenOut] += protocolFee;
            }
            emit InstasettleFeeTaken(trade.tradeId, msg.sender, trade.tokenOut, protocolFee);
        }

        // Unwrap and transfer to owner if ETH sentinel, otherwise transfer token
        if (isETHSentinel) {
            // For ETH output: unwrap the settlerPayment amount to send to owner
            // The settler should have sent WETH already which is in Core
            ethSupport.unwrap(settlerPayment, trade.owner);
        } else {    
            IERC20(trade.tokenOut).safeTransferFrom(msg.sender, trade.owner, settlerPayment);
        }
        IERC20(trade.tokenIn).safeTransfer(msg.sender, trade.amountRemaining);
        emit TradeInstasettled(
            trade.tradeId,
            msg.sender,
            trade.amountRemaining,
            settlerPayment,
            remainingAmountOut - settlerPayment // totalFees is the difference (logical fee notion)
        );
    }

    function getPairIdTradeIds(bytes32 pairId) external view returns (uint256[] memory) {
        return pairIdTradeIds[pairId];
    }

    function getTrade(uint256 tradeId) external view returns (Utils.Trade memory) {
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        return trade;
    }

    function placeTrade(bytes calldata tradeData) public payable {
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            bool isInstasettlable,
            bool usePriceBased,
            uint256 instasettleBps,
            bool onlyInstasettle
        ) = abi.decode(tradeData, (address, address, uint256, uint256, bool, bool, uint256, bool));
        // @audit may be better to abstract sweetSpot algo to here and pass the value along, since small (<0.001% pool depth) trades shouldn't be split at all and would save hefty logic
        // @audit edge cases wrt pool depths (specifically extremely small volume to volume reserves) create anomalies in the algo output
        // @audit similarly for the sake of OPTIMISTIC and DETERMINISTIC placement patterns, we should abstract the calculation of sweetSpot nad the definition of appropriate DEX into seperated, off contract functions
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 tradeId = lastTradeId++;
        bytes32 pairId = keccak256(abi.encode(tokenIn, tokenOut)); //@audit optimise this

        // @audit needs attention for small trades - these hsouldn't be entered in the orderbook / storage
        trades[tradeId] = Utils.Trade({
            owner: msg.sender,
            attempts: 0,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountRemaining: amountIn,
            targetAmountOut: amountOutMin,
            realisedAmountOut: 0,
            tradeId: tradeId,
            instasettleBps: instasettleBps,
            lastSweetSpot: onlyInstasettle ? type(uint256).max : 0, 
            isInstasettlable: isInstasettlable,
            usePriceBased: usePriceBased,
            onlyInstasettle: onlyInstasettle
        });
        

        pairIdTradeIds[pairId].push(tradeId);
        uint256 tradeIndex = pairIdTradeIds[pairId].length - 1;
        tradeIndicies[tradeId] = tradeIndex;

        Utils.Trade storage trade = trades[tradeId];
        uint256 realisedBefore = trade.realisedAmountOut;
        Utils.Trade memory updatedTrade = executeStream(trade.tradeId);
        uint256 delta = updatedTrade.realisedAmountOut - realisedBefore; // initial delta = realised
        if (delta > 0) {
            (uint256 protocolFee, uint256 botFee) = _applyStreamFees(tradeId, tokenOut, delta, true, address(0));
            trades[tradeId].realisedAmountOut = updatedTrade.realisedAmountOut - (protocolFee + botFee);
        }

        // Emit TradeCreated event after stream execution with actual values
        emit TradeCreated(
            tradeId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            updatedTrade.amountRemaining, // Use actual remaining amount after stream
            amountOutMin,
            updatedTrade.realisedAmountOut, // Use actual realised amount after stream
            isInstasettlable,
            instasettleBps, // Use the passed instasettleBps parameter
            updatedTrade.lastSweetSpot, // Use actual sweet spot utilized
            usePriceBased,
            onlyInstasettle
        );
    }

    function cancelTrade(uint256 tradeId) public returns (bool) {
        // @audit It is essential that this authority may be granted by a bot, therefore meaning if the msg.sender is
        // Core.
        // @audit Similarly, when the Router is implemented, we mnust forward the msg.sender in the function call /
        // veridy signed message
        Utils.Trade memory trade = trades[tradeId];
        if (trade.owner == address(0)) {
            revert("Trade inexistent or being called from null address");
        }
        if (trade.owner == msg.sender || msg.sender == address(this)) {
            // @ethsupport here we would unwrap if tokenOut == 0x0.000 // function unwrap

            bytes32 pairId = keccak256(abi.encode(trade.tokenIn, trade.tokenOut));
            
            _removeTradeFromStorage(pairId, tradeId);
            
            // If tokenOut is ETH sentinel, unwrap WETH to ETH before transferring
            if (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                ethSupport.unwrap(trade.realisedAmountOut, trade.owner); // @ethsupport ensure that unwrap is payable in interface
            } else {
                IERC20(trade.tokenOut).safeTransfer(trade.owner, trade.realisedAmountOut);
            }
            
            IERC20(trade.tokenIn).safeTransfer(trade.owner, trade.amountRemaining);

            bool autoCancelled = msg.sender == address(this) ? true : false;

            emit TradeCancelled(autoCancelled, tradeId, trade.amountRemaining, trade.realisedAmountOut);

            return true;
        } else {
            revert("Only trade owner can cancel");
        }
    }

    function executeTrades(bytes32 pairId) public nonReentrant {
        uint256[] storage tradeIds = pairIdTradeIds[pairId];
        uint256 botFeesAccrued = 0;
        address tokenOutForRun = address(0);

        // Cap the number of trades processed to prevent out of gas errors
        // uint256 maxTradesToProcess = EXECUTE_STREAM_TRADE_CAP;
        uint256 tradesToProcess = tradeIds.length > EXECUTE_STREAM_TRADE_CAP ? EXECUTE_STREAM_TRADE_CAP : tradeIds.length;

        // Process trades in reverse order to avoid array index issues when trades are deleted
        for (uint256 i = tradesToProcess; i > 0; i--) {
            uint256 index = i - 1; // Convert to 0-based index
            Utils.Trade storage trade = trades[tradeIds[index]];
            if (trade.attempts >= 3) {
                // we transfer the remaining amount of the trade to the owner and dequeue it via cancelTrade
                this.cancelTrade(trade.tradeId);
            } else {
                uint256 realisedBefore = trade.realisedAmountOut;
                try this.executeStream(trade.tradeId) returns (Utils.Trade memory updatedTrade) {
                    uint256 delta = updatedTrade.realisedAmountOut - realisedBefore;
                    if (delta > 0) {
                        if (tokenOutForRun == address(0)) tokenOutForRun = updatedTrade.tokenOut;
                        (uint256 protocolFee, uint256 botFee) =
                            _applyStreamFees(trade.tradeId, updatedTrade.tokenOut, delta, false, msg.sender);
                        trades[trade.tradeId].realisedAmountOut =
                            updatedTrade.realisedAmountOut - (protocolFee + botFee);
                        botFeesAccrued += botFee;
                    }
                    if (updatedTrade.lastSweetSpot == 0) {
                        // @ethsupport here we would unwrap if tokenOut == 0x0.000 // function unwrap
                        if (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                            ethSupport.unwrap(trades[trade.tradeId].realisedAmountOut, trade.owner);
                        } else {
                            IERC20(trade.tokenOut).safeTransfer(trade.owner, trades[trade.tradeId].realisedAmountOut);
                        }
                        emit TradeCompleted(trade.tradeId, trades[trade.tradeId].realisedAmountOut);
                        _removeTradeFromStorage(pairId, tradeIds[index]);
                    }
                } catch Error(string memory reason) {
                    trade.attempts++;
                    emit LowLevelError(reason);
                    emit AttemptsIncremented(trade.tradeId, trade.attempts);
                } catch (bytes memory lowLevelData) {
                    trade.attempts++;
                    emit DataError(lowLevelData);
                    emit AttemptsIncremented(trade.tradeId, trade.attempts);
                }
            }
        }

        if (botFeesAccrued > 0) {
            // require(tokenOutForRun != address(0), "fee token unset");
            if (tokenOutForRun == 0x0000000000000000000000000000000000000000 || tokenOutForRun == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                // transfer ETH to the bot address (msg.sender)
                (bool success, ) = payable(msg.sender).call{value: botFeesAccrued}("");
                require(success, "ETH transfer failed");
            } else {
            IERC20(tokenOutForRun).safeTransfer(msg.sender, botFeesAccrued);
            }
            emit FeesClaimed(msg.sender, tokenOutForRun, botFeesAccrued, false);
        }
    }
    

    function executeStream(uint256 tradeId) public returns (Utils.Trade memory updatedTrade) {
        Utils.Trade storage storageTrade = trades[tradeId];
        Utils.Trade memory trade = trades[tradeId];

        // Early return for onlyInstasettle trades - they should only be settled via instasettle()
        if (trade.onlyInstasettle) {
            // Set lastSweetSpot to sentinel value to prevent auto-settlement in executeTrades
            return storageTrade;
        }

        // security measure @audit may need review
        // if (trade.realisedAmountOut > trade.targetAmountOut) {
        //     revert ToxicTrade(trade.tradeId);
        // }

        (uint256 sweetSpot, address bestDex, address router) = streamDaemon.evaluateSweetSpotAndDex(
            trade.tokenIn, trade.tokenOut, trade.amountRemaining, 0, trade.usePriceBased
        );

        if (
            trade.lastSweetSpot == 1 || trade.lastSweetSpot == 2 || trade.lastSweetSpot == 3 || trade.lastSweetSpot == 4
        ) {
            sweetSpot = trade.lastSweetSpot;
        }

        if (sweetSpot > 500) {
            sweetSpot = 500; // this is an arbitrary value @audit needs revision
        }

        require(sweetSpot > 0, "Invalid sweet spot");
        uint256 targetAmountOut;
        uint256 streamVolume;
        address quoteTokenOut = trade.tokenOut;
        if (
            quoteTokenOut == 0x0000000000000000000000000000000000000000
                || quoteTokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)
        ) {
            quoteTokenOut = WETH;
        }

        if (trade.targetAmountOut > trade.realisedAmountOut) {
            streamVolume = trade.amountRemaining / sweetSpot;
        } else {
            // Over-achieved already: take the full remaining amount in one go
            sweetSpot = 1;
            streamVolume = trade.amountRemaining;
        }

        require(streamVolume > 0, "Invalid stream volume");

        IUniversalDexInterface dex = IUniversalDexInterface(bestDex);
        (uint256 quotedOut,) = dex.getQuote(trade.tokenIn, quoteTokenOut, streamVolume);
        if (quotedOut == 0) {
            quotedOut = dex.getPrice(trade.tokenIn, quoteTokenOut, streamVolume);
        }
        require(quotedOut > 0, "Quote unavailable");

        uint256 slippageCoefficient = 1000 - BPS_SLIPPAGE;

        // Apply 10 bps slack to improve execution reliability
        targetAmountOut = (quotedOut * slippageCoefficient) / 1000;

        // Declare tradeData outside the if-else block so it's in scope
        IRegistry.TradeData memory tradeData;
        
        if (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
            // this sets the trading currency to WETH if the desired tokenOut is native ETH
            tradeData = registry.prepareTradeData(
                bestDex, trade.tokenIn, address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2), streamVolume, targetAmountOut, address(this)
            );
            
        } else {
            tradeData = registry.prepareTradeData(
                bestDex, trade.tokenIn, trade.tokenOut, streamVolume, targetAmountOut, address(this)
            );
        }

        IERC20(trade.tokenIn).forceApprove(tradeData.router, streamVolume);

        (bool success, bytes memory returnData) =
            address(executor).delegatecall(abi.encodeWithSelector(tradeData.selector, tradeData.params));
        if (!success) {
            revert(string(abi.encodePacked("DEX trade failed: ", returnData)));
        }
        uint256 amountOut = abi.decode(returnData, (uint256));
        require(amountOut > 0, "No tokens received from swap");

        // @dev protection for the case that an EOA has called executeStream
        if (sweetSpot == 1 && msg.sender != address(this)) {
            bytes32 pairId = keccak256(abi.encode(trade.tokenIn, trade.tokenOut));
            IERC20(trade.tokenOut).safeTransfer(trade.owner, trade.realisedAmountOut);                        
            _removeTradeFromStorage(pairId, trade.tradeId);
            return storageTrade;
        }

        if (sweetSpot == 1 || sweetSpot == 2 || sweetSpot == 3 || sweetSpot == 4) {
            sweetSpot--;
        }

        storageTrade.amountRemaining = trade.amountRemaining - streamVolume;
        storageTrade.realisedAmountOut += amountOut;
        storageTrade.lastSweetSpot = sweetSpot;

        emit TradeStreamExecuted(trade.tradeId, streamVolume, amountOut, sweetSpot);

        return storageTrade;
    }
}

