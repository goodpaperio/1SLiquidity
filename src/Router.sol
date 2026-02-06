// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/ICore.sol";

contract Router {
    ICore public core;

    event InstaSettleConfigured(uint256 indexed tradeId, bool enabled, uint256 instasettleBps);

    constructor(address _core) {
        core = ICore(_core);
    }

    function configureInstaSettle(uint256 tradeId, bool enabled, uint256 instasettleBps) external {
        // Implementation will be added later
        emit InstaSettleConfigured(tradeId, enabled, instasettleBps);
    }
}
