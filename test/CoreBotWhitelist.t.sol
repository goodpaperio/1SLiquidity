// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Test } from "forge-std/Test.sol";
import { Deploys } from "test/shared/Deploys.sol";
import { Core } from "src/Core.sol";

/**
 * @title CoreBotWhitelistTest
 * @notice Tests for v1.0.6 bot whitelist: only authorised EOAs can call executeTrades when whitelist is populated.
 */
contract CoreBotWhitelistTest is Deploys {
    address constant BOT_ONE = address(0xB01);
    address constant BOT_TWO = address(0xB02);
    address constant RANDOM_USER = address(0x1234);

    bytes32 pairId;

    /// @dev Core's owner is the DeployCore contract (deployer), not the test. Use for admin calls.
    function _asOwner() internal view returns (address) {
        return core.owner();
    }

    function setUp() public override {
        super.setUp();
        pairId = keccak256(abi.encode(address(1), address(2)));
    }

    // --- Whitelist getter/setter behaviour ---

    function test_isBotWhitelisted_returnsFalseByDefault() public view {
        assertFalse(core.isBotWhitelisted(BOT_ONE));
        assertFalse(core.isBotWhitelisted(RANDOM_USER));
    }

    function test_addBot_addsBotAndEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit Core.BotAdded(BOT_ONE);
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);

        assertTrue(core.isBotWhitelisted(BOT_ONE));
        assertEq(core.botWhitelistCount(), 1);
    }

    function test_addBot_onlyOwner() public {
        vm.prank(RANDOM_USER);
        vm.expectRevert();
        core.addBot(BOT_ONE);
    }

    function test_addBot_revertsZeroAddress() public {
        vm.prank(_asOwner());
        vm.expectRevert("Bot cannot be zero address");
        core.addBot(address(0));
    }

    function test_addBot_idempotentDoesNotDoubleCount() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        assertEq(core.botWhitelistCount(), 1);
        assertTrue(core.isBotWhitelisted(BOT_ONE));
    }

    function test_removeBot_removesBotAndEmitsEvent() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        vm.expectEmit(true, true, true, true);
        emit Core.BotRemoved(BOT_ONE);
        vm.prank(_asOwner());
        core.removeBot(BOT_ONE);

        assertFalse(core.isBotWhitelisted(BOT_ONE));
        assertEq(core.botWhitelistCount(), 0);
    }

    function test_removeBot_onlyOwner() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        vm.prank(RANDOM_USER);
        vm.expectRevert();
        core.removeBot(BOT_ONE);
    }

    function test_removeBot_idempotentWhenNotWhitelisted() public {
        vm.prank(_asOwner());
        core.removeBot(BOT_ONE);
        assertEq(core.botWhitelistCount(), 0);
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        vm.prank(_asOwner());
        core.removeBot(BOT_ONE);
        vm.prank(_asOwner());
        core.removeBot(BOT_ONE);
        assertEq(core.botWhitelistCount(), 0);
    }

    function test_addRemove_multipleBots() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        vm.prank(_asOwner());
        core.addBot(BOT_TWO);
        assertEq(core.botWhitelistCount(), 2);
        assertTrue(core.isBotWhitelisted(BOT_ONE));
        assertTrue(core.isBotWhitelisted(BOT_TWO));

        vm.prank(_asOwner());
        core.removeBot(BOT_ONE);
        assertEq(core.botWhitelistCount(), 1);
        assertFalse(core.isBotWhitelisted(BOT_ONE));
        assertTrue(core.isBotWhitelisted(BOT_TWO));
    }

    // --- executeTrades authority: whitelist empty vs populated ---

    function test_executeTrades_whenWhitelistEmpty_anyoneCanCall() public {
        assertEq(core.botWhitelistCount(), 0);
        vm.prank(RANDOM_USER);
        core.executeTrades(pairId);
        vm.prank(BOT_ONE);
        core.executeTrades(pairId);
        vm.prank(address(this));
        core.executeTrades(pairId);
    }

    function test_executeTrades_whenWhitelistPopulated_onlyWhitelistedCanCall() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);

        vm.prank(BOT_ONE);
        core.executeTrades(pairId);

        vm.prank(RANDOM_USER);
        vm.expectRevert(Core.NotAuthorisedBot.selector);
        core.executeTrades(pairId);
    }

    function test_executeTrades_whenWhitelistPopulated_ownerNotWhitelistedReverts() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        address owner = core.owner();
        vm.assume(owner != BOT_ONE);
        vm.prank(owner);
        vm.expectRevert(Core.NotAuthorisedBot.selector);
        core.executeTrades(pairId);
    }

    function test_executeTrades_afterRemoveLastBot_anyoneCanCallAgain() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        vm.prank(RANDOM_USER);
        vm.expectRevert(Core.NotAuthorisedBot.selector);
        core.executeTrades(pairId);

        vm.prank(_asOwner());
        core.removeBot(BOT_ONE);
        vm.prank(RANDOM_USER);
        core.executeTrades(pairId);
    }

    // --- placeTrade is NOT restricted by bot whitelist (anyone can place trades) ---

    function test_placeTrade_notRestrictedByBotWhitelist() public {
        vm.prank(_asOwner());
        core.addBot(BOT_ONE);
        assertGt(core.botWhitelistCount(), 0);

        // RANDOM_USER is not whitelisted. placeTrade has no onlyBot modifier, so it must
        // revert for a different reason (e.g. transfer), not NotAuthorisedBot.
        vm.prank(RANDOM_USER);
        (bool success, bytes memory reason) = address(core).call(
            abi.encodeWithSelector(
                Core.placeTrade.selector,
                abi.encode(
                    address(1),  // tokenIn (non-contract)
                    address(2),
                    uint256(0),
                    uint256(0),
                    false,
                    false,
                    uint256(0),
                    false
                )
            )
        );
        assertFalse(success, "placeTrade should revert (e.g. SafeERC20)");
        if (reason.length >= 4) {
            bytes4 selector = bytes4(reason);
            assertTrue(selector != Core.NotAuthorisedBot.selector, "placeTrade must not be restricted by bot whitelist");
        }
    }
}
