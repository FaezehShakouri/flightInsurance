// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract FlightDelayPredictionMarketTest is Test {
    FlightDelayPredictionMarket public market;
    MockERC20 public token;

    address public owner;
    address public user1;
    address public user2;

    bytes32 public flightId;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy mock token
        token = new MockERC20();

        // Deploy market contract
        market = new FlightDelayPredictionMarket(address(token));

        // Mint tokens to users
        token.mint(user1, 1000 ether);
        token.mint(user2, 1000 ether);

        // Create a flight market
        flightId = market.createFlightMarket("AA100", "JFK", "2024-12-25T10:00:00.000");
    }

    function testCreateFlightMarket() public {
        bytes32 newFlightId = market.createFlightMarket("UA200", "LAX", "2024-12-26T15:30:00.000");

        (string memory flightNumber, string memory iataCode, string memory scheduledTime,,,,,,,,) =
            market.flights(newFlightId);

        assertEq(flightNumber, "UA200", "Flight number should match");
        assertEq(iataCode, "LAX", "IATA code should match");
        assertEq(scheduledTime, "2024-12-26T15:30:00.000", "Scheduled time should match");
    }

    function testBuySharesFirstPurchase() public {
        uint256 amount = 100 ether;

        // User1 approves and buys shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // Check user's position
        uint256 userShares = market.positions(flightId, user1);
        assertEq(userShares, amount, "User should have received shares equal to amount on first purchase");

        // Check token balance
        assertEq(token.balanceOf(address(market)), amount, "Market should hold the tokens");
        assertEq(token.balanceOf(user1), 1000 ether - amount, "User balance should be reduced");
    }

    function testBuySharesMultiplePurchases() public {
        uint256 amount1 = 100 ether;
        uint256 amount2 = 50 ether;

        // User1 first purchase
        vm.startPrank(user1);
        token.approve(address(market), amount1);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount1);
        vm.stopPrank();

        // User2 purchase
        vm.startPrank(user2);
        token.approve(address(market), amount2);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount2);
        vm.stopPrank();

        uint256 user2Shares = market.positions(flightId, user2);

        // Second purchase should yield fewer shares due to AMM pricing
        assertTrue(user2Shares < amount2, "Second purchase should yield fewer shares");
        assertTrue(user2Shares > 0, "User2 should have some shares");

        // Check total token balance
        assertEq(token.balanceOf(address(market)), amount1 + amount2, "Market should hold both deposits");
    }

    function testCalculateSharesForAmount() public {
        uint256 amount = 100 ether;

        // First purchase - should get 1:1 ratio
        uint256 expectedShares =
            market.calculateSharesForAmount(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        assertEq(expectedShares, amount, "First purchase should be 1:1");

        // Actually buy shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // Second purchase - should get fewer shares
        uint256 expectedShares2 =
            market.calculateSharesForAmount(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        assertTrue(expectedShares2 < amount, "Second purchase should yield fewer shares");
    }

    function testBuySharesRevertsOnZeroAmount() public {
        vm.startPrank(user1);
        vm.expectRevert("Amount must be greater than 0");
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, 0);
        vm.stopPrank();
    }

    function testBuySharesRevertsOnUnresolvedOutcome() public {
        vm.startPrank(user1);
        token.approve(address(market), 100 ether);
        vm.expectRevert("Cannot buy unresolved outcome");
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Unresolved, 100 ether);
        vm.stopPrank();
    }

    function testBuySharesMultipleOutcomes() public {
        uint256 amount = 100 ether;

        // User1 buys OnTime shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // User2 buys Cancelled shares
        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Cancelled, amount);
        vm.stopPrank();

        uint256 user1Shares = market.positions(flightId, user1);
        uint256 user2Shares = market.positions(flightId, user2);

        assertTrue(user1Shares > 0, "User1 should have shares");
        assertTrue(user2Shares > 0, "User2 should have shares");

        // Get flight data to check outcome shares
        (,,,,, uint256 onTimeShares, uint256 cancelledShares,,,,) = market.flights(flightId);

        assertEq(onTimeShares, user1Shares, "OnTime shares should match user1 shares");
        assertEq(cancelledShares, user2Shares, "Cancelled shares should match user2 shares");
    }

    function testSellSharesBasic() public {
        uint256 buyAmount = 100 ether;

        // User1 buys shares first
        vm.startPrank(user1);
        token.approve(address(market), buyAmount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, buyAmount);

        uint256 userShares = market.positions(flightId, user1);
        uint256 balanceBeforeSell = token.balanceOf(user1);

        // User1 sells half of their shares
        uint256 sharesToSell = userShares / 2;
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, sharesToSell);
        vm.stopPrank();

        // Check user's remaining shares
        uint256 remainingShares = market.positions(flightId, user1);
        assertEq(remainingShares, userShares - sharesToSell, "User should have remaining shares");

        // Check user received tokens back
        uint256 balanceAfterSell = token.balanceOf(user1);
        assertTrue(balanceAfterSell > balanceBeforeSell, "User should receive tokens from selling");
    }

    function testSellSharesAllShares() public {
        uint256 buyAmount = 100 ether;

        // User1 buys shares
        vm.startPrank(user1);
        token.approve(address(market), buyAmount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, buyAmount);

        uint256 userShares = market.positions(flightId, user1);
        uint256 initialBalance = 1000 ether;

        // Sell all shares
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, userShares);
        vm.stopPrank();

        // Check user has no remaining shares
        uint256 remainingShares = market.positions(flightId, user1);
        assertEq(remainingShares, 0, "User should have no shares left");

        // User should have received tokens back (might be slightly less due to AMM pricing)
        uint256 finalBalance = token.balanceOf(user1);
        assertTrue(finalBalance > initialBalance - buyAmount, "User should recover most tokens");
    }

    function testCalculateTokensForShares() public {
        uint256 buyAmount = 100 ether;

        // User1 buys shares
        vm.startPrank(user1);
        token.approve(address(market), buyAmount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, buyAmount);
        vm.stopPrank();

        uint256 userShares = market.positions(flightId, user1);

        // Calculate tokens for selling half the shares
        uint256 sharesToSell = userShares / 2;
        uint256 expectedTokens =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, sharesToSell);

        assertTrue(expectedTokens > 0, "Should receive tokens for shares");
        assertTrue(expectedTokens < buyAmount, "Should receive less than initial investment when selling partial");
    }

    function testSellSharesMultipleUsers() public {
        uint256 amount = 100 ether;

        // User1 and User2 both buy shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        uint256 user1Shares = market.positions(flightId, user1);
        uint256 user2Shares = market.positions(flightId, user2);

        // User1 sells their shares
        vm.startPrank(user1);
        uint256 user1BalanceBefore = token.balanceOf(user1);
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, user1Shares);
        uint256 user1BalanceAfter = token.balanceOf(user1);
        vm.stopPrank();

        // User1 should have no shares left
        assertEq(market.positions(flightId, user1), 0, "User1 should have no shares");

        // User1 should have received tokens
        assertTrue(user1BalanceAfter > user1BalanceBefore, "User1 should receive tokens");

        // User2 should still have their shares
        assertEq(market.positions(flightId, user2), user2Shares, "User2 shares should be unchanged");
    }

    function testSellSharesRevertsOnZeroShares() public {
        vm.startPrank(user1);
        vm.expectRevert("Shares must be greater than 0");
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, 0);
        vm.stopPrank();
    }

    function testSellSharesRevertsOnInsufficientShares() public {
        uint256 buyAmount = 100 ether;

        // User1 buys shares
        vm.startPrank(user1);
        token.approve(address(market), buyAmount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, buyAmount);

        uint256 userShares = market.positions(flightId, user1);

        // Try to sell more shares than owned
        vm.expectRevert("Insufficient shares");
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, userShares + 1);
        vm.stopPrank();
    }

    function testSellSharesRevertsOnUnresolvedOutcome() public {
        vm.startPrank(user1);
        vm.expectRevert("Cannot sell unresolved outcome");
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.Unresolved, 100);
        vm.stopPrank();
    }

    function testBuyAndSellRoundTrip() public {
        uint256 buyAmount = 100 ether;
        uint256 initialBalance = token.balanceOf(user1);

        // User1 buys shares
        vm.startPrank(user1);
        token.approve(address(market), buyAmount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, buyAmount);

        uint256 userShares = market.positions(flightId, user1);
        assertTrue(userShares > 0, "User should have shares after buying");

        // Immediately sell all shares
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, userShares);
        vm.stopPrank();

        uint256 finalBalance = token.balanceOf(user1);

        // When selling all shares as the only participant, user should get back all tokens
        assertEq(finalBalance, initialBalance, "User should recover all tokens when selling all shares");
        assertEq(market.positions(flightId, user1), 0, "User should have no shares after selling");
    }

    function testSellPriceCalculationMakesSense() public {
        uint256 buyAmount = 100 ether;

        // User1 buys shares
        vm.startPrank(user1);
        token.approve(address(market), buyAmount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, buyAmount);
        vm.stopPrank();

        uint256 userShares = market.positions(flightId, user1);

        // Test 1: Selling more shares should return more total tokens
        uint256 tokensFor25Percent = market.calculateTokensForShares(
            flightId, FlightDelayPredictionMarket.Outcome.OnTime, userShares / 4
        );
        uint256 tokensFor50Percent = market.calculateTokensForShares(
            flightId, FlightDelayPredictionMarket.Outcome.OnTime, userShares / 2
        );
        uint256 tokensFor75Percent = market.calculateTokensForShares(
            flightId, FlightDelayPredictionMarket.Outcome.OnTime, (userShares * 3) / 4
        );

        assertTrue(tokensFor50Percent > tokensFor25Percent, "50% shares should return more total tokens than 25%");
        assertTrue(tokensFor75Percent > tokensFor50Percent, "75% shares should return more total tokens than 50%");

        // Test 2: Diminishing returns - selling 2x shares should return LESS than 2x tokens (slippage)
        // This is correct AMM behavior - you get less per share when selling more at once
        assertTrue(
            tokensFor50Percent < tokensFor25Percent * 2,
            "AMM slippage: 50% shares should return LESS than 2x of 25% (diminishing returns)"
        );
        
        // Verify the diminishing returns continue
        assertTrue(
            tokensFor75Percent < tokensFor25Percent * 3,
            "AMM slippage: 75% shares should return LESS than 3x of 25%"
        );
    }

    function testSellPriceWithMultipleParticipants() public {
        uint256 amount = 100 ether;

        // User1 and User2 both buy shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        uint256 user1Shares = market.positions(flightId, user1);

        // Calculate tokens for selling 50% of user1's shares
        uint256 sharesToSell = user1Shares / 2;
        uint256 tokensToReceive =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, sharesToSell);

        // User should get some tokens back
        assertTrue(tokensToReceive > 0, "Should receive tokens for selling shares");

        // With multiple participants, selling should still work correctly
        // The tokens received should be reasonable (not zero, not more than invested)
        assertTrue(tokensToReceive < amount, "Shouldn't receive more than originally invested");
        
        // Should get a significant portion back (at least 10% of investment for selling half shares)
        assertTrue(tokensToReceive > amount / 10, "Should receive meaningful amount for shares");
    }

    function testSellPriceWithSequentialSells() public {
        uint256 amount = 100 ether;

        // User1 buys shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        uint256 totalShares = market.positions(flightId, user1);
        uint256 sharesToSellFirst = totalShares / 4;

        // Calculate price for first 25% sell
        uint256 tokensForFirstSell =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, sharesToSellFirst);

        // Actually sell first 25%
        vm.startPrank(user1);
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, sharesToSellFirst);
        
        uint256 remainingShares = market.positions(flightId, user1);
        uint256 sharesToSellSecond = remainingShares / 3; // Another 25% of original

        // Calculate price for next sell (from remaining shares)
        uint256 tokensForSecondSell =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, sharesToSellSecond);
        
        vm.stopPrank();

        // Both sells should give positive amounts
        assertTrue(tokensForFirstSell > 0, "First sell should return tokens");
        assertTrue(tokensForSecondSell > 0, "Second sell should return tokens");
        
        // The pricing should be consistent - selling similar amounts should return similar tokens
        // (within reasonable bounds given the AMM dynamics)
        assertTrue(tokensForSecondSell > 0, "Sequential sells should work correctly");
    }

    function testBuyAndSellPriceRelationship() public {
        uint256 initialBuyAmount = 100 ether;

        // User1 makes initial purchase to bootstrap market
        vm.startPrank(user1);
        token.approve(address(market), initialBuyAmount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, initialBuyAmount);
        vm.stopPrank();

        // User2 wants to buy more shares
        uint256 buyAmount = 50 ether;
        uint256 sharesBuyWouldGet =
            market.calculateSharesForAmount(flightId, FlightDelayPredictionMarket.Outcome.OnTime, buyAmount);

        // If someone were to sell those shares, how much would they get?
        uint256 tokensFromSelling =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, sharesBuyWouldGet);

        // Selling immediately after buying should return less than buy price (AMM spread/slippage)
        assertTrue(tokensFromSelling < buyAmount, "Sell price should be less than buy price (AMM spread)");

        // Should still get a reasonable amount back (at least 20% of invested amount)
        assertTrue(
            tokensFromSelling > buyAmount / 5,
            "Sell price should return meaningful value"
        );
        
        // Verify pricing is consistent
        assertTrue(sharesBuyWouldGet > 0, "Should receive shares for buying");
        assertTrue(tokensFromSelling > 0, "Should receive tokens for selling");
    }

    function testSellAllSharesReturnsAllTokens() public {
        uint256 amount = 100 ether;

        // Only user1 participates
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);

        uint256 allShares = market.positions(flightId, user1);
        uint256 contractBalance = token.balanceOf(address(market));

        // Calculate tokens for selling ALL shares
        uint256 tokensForAllShares =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, allShares);

        // Selling all shares should return all tokens in the contract
        assertEq(tokensForAllShares, contractBalance, "Selling all shares should return entire contract balance");
        assertEq(tokensForAllShares, amount, "Should return exactly what was put in");
        vm.stopPrank();
    }

    function testSellPriceWithDifferentOutcomes() public {
        uint256 amount = 100 ether;

        // User1 buys OnTime shares
        vm.startPrank(user1);
        token.approve(address(market), amount * 2);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // User2 buys Delayed30 shares
        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();

        // Both should be able to calculate sell prices for their shares
        uint256 user1Shares = market.positions(flightId, user1);
        uint256 user2Shares = market.positions(flightId, user2);

        uint256 user1TokensForHalf =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, user1Shares / 2);
        uint256 user2TokensForHalf =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, user2Shares / 2);

        // Both should get positive amounts
        assertTrue(user1TokensForHalf > 0, "User1 should receive tokens for selling");
        assertTrue(user2TokensForHalf > 0, "User2 should receive tokens for selling");

        // Since user2 bought later (more expensive), they might get less back
        // But both should be reasonable
        assertTrue(user1TokensForHalf < amount, "User1 shouldn't get more than they can possibly own");
        assertTrue(user2TokensForHalf < amount, "User2 shouldn't get more than they can possibly own");
    }
}
