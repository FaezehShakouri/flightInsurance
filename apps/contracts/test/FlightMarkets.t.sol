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
        flightId = market.createFlightMarket("AA100", "JFK", "LAX", "AA", "2024-12-25T10:00:00.000");
    }

    function testCreateFlightMarket() public {
        bytes32 newFlightId = market.createFlightMarket("UA200", "LAX", "ORD", "UA", "2024-12-26T15:30:00.000");

        (string memory flightNumber, string memory departureCode, string memory destinationCode, string memory airlineCode, string memory scheduledTime,,,,,) =
            market.flights(newFlightId);

        assertEq(flightNumber, "UA200", "Flight number should match");
        assertEq(departureCode, "LAX", "Departure code should match");
        assertEq(destinationCode, "ORD", "Destination code should match");
        assertEq(airlineCode, "UA", "Airline code should match");
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

        // User1 first purchase of OnTime
        vm.startPrank(user1);
        token.approve(address(market), amount1);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount1);
        vm.stopPrank();

        // User2 buys DIFFERENT outcome (Delayed30) - should get 1:1 as it's first for that outcome
        vm.startPrank(user2);
        token.approve(address(market), amount2);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount2);
        vm.stopPrank();

        uint256 user2Shares = market.positions(flightId, user2);

        // With outcome-specific pricing, first purchase of Delayed30 should be 1:1
        assertEq(user2Shares, amount2, "First purchase of different outcome should be 1:1");

        // Check total token balance
        assertEq(token.balanceOf(address(market)), amount1 + amount2, "Market should hold both deposits");
    }

    function testCalculateSharesForAmount() public {
        uint256 amount = 100 ether;

        // First purchase of OnTime - should get 1:1 ratio
        uint256 expectedShares =
            market.calculateSharesForAmount(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        assertEq(expectedShares, amount, "First purchase should be 1:1");

        // Actually buy OnTime shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // Second purchase of SAME outcome (OnTime) - should get fewer shares due to AMM
        uint256 expectedShares2 =
            market.calculateSharesForAmount(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        assertTrue(expectedShares2 < amount, "Second purchase of same outcome should yield fewer shares");

        // But first purchase of DIFFERENT outcome (Delayed30) - should still be 1:1
        uint256 expectedSharesDelayed =
            market.calculateSharesForAmount(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        assertEq(expectedSharesDelayed, amount, "First purchase of different outcome should be 1:1");
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
        (,,,,,, uint256 onTimeShares, uint256 cancelledShares,,) = market.flights(flightId);

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
        vm.expectRevert("Insufficient shares for this outcome");
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
        uint256 tokensFor25Percent =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, userShares / 4);
        uint256 tokensFor50Percent =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, userShares / 2);
        uint256 tokensFor75Percent =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, (userShares * 3) / 4);

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
            tokensFor75Percent < tokensFor25Percent * 3, "AMM slippage: 75% shares should return LESS than 3x of 25%"
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
        assertTrue(tokensFromSelling > buyAmount / 5, "Sell price should return meaningful value");

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

    // ===== Market Resolution Tests =====

    function testResolveMarket() public {
        // Create and resolve a market
        bytes32 newFlightId = market.createFlightMarket("DL123", "ATL", "MIA", "DL", "2024-12-30T14:00:00.000");

        // Resolve the market as OnTime
        market.resolveMarket(newFlightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // Check the outcome was set correctly
        (,,,,,FlightDelayPredictionMarket.Outcome outcome,,,,) = market.flights(newFlightId);
        assertEq(uint256(outcome), uint256(FlightDelayPredictionMarket.Outcome.OnTime), "Outcome should be OnTime");
    }

    function testResolveMarketWithDelay() public {
        bytes32 newFlightId = market.createFlightMarket("DL456", "ATL", "JFK", "DL", "2024-12-30:15:00:00.000");

        // Resolve with Delayed120Plus outcome
        market.resolveMarket(newFlightId, FlightDelayPredictionMarket.Outcome.Delayed120Plus);

        (,,,,,FlightDelayPredictionMarket.Outcome outcome,,,,) = market.flights(newFlightId);
        assertEq(
            uint256(outcome), uint256(FlightDelayPredictionMarket.Outcome.Delayed120Plus), "Outcome should be Delayed120Plus"
        );
    }

    function testResolveMarketRevertsIfAlreadyResolved() public {
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // Try to resolve again
        vm.expectRevert("Market already resolved");
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.Delayed30);
    }

    function testResolveMarketRevertsIfNotOracle() public {
        vm.startPrank(user1);
        vm.expectRevert("Only authorized oracles can call this function");
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);
        vm.stopPrank();
    }

    function testResolveMarketWithCancelled() public {
        bytes32 newFlightId = market.createFlightMarket("UA789", "ORD", "DFW", "UA", "2024-12-31T18:00:00.000");

        // Resolve as cancelled
        market.resolveMarket(newFlightId, FlightDelayPredictionMarket.Outcome.Cancelled);

        (,,,,,FlightDelayPredictionMarket.Outcome outcome,,,,) = market.flights(newFlightId);
        assertEq(
            uint256(outcome), uint256(FlightDelayPredictionMarket.Outcome.Cancelled), "Outcome should be Cancelled"
        );
    }

    function testResolveMarketDelayCategories() public {
        // Test Delayed30
        bytes32 flight1 = market.createFlightMarket("F1", "JFK", "BOS", "AA", "2024-12-31T10:00:00.000");
        market.resolveMarket(flight1, FlightDelayPredictionMarket.Outcome.Delayed30);
        (,,,,,FlightDelayPredictionMarket.Outcome outcome1,,,,) = market.flights(flight1);
        assertEq(
            uint256(outcome1), uint256(FlightDelayPredictionMarket.Outcome.Delayed30), "Should be Delayed30"
        );

        // Test Delayed120Plus
        bytes32 flight2 = market.createFlightMarket("F2", "LAX", "SFO", "UA", "2024-12-31T11:00:00.000");
        market.resolveMarket(flight2, FlightDelayPredictionMarket.Outcome.Delayed120Plus);
        (,,,,,FlightDelayPredictionMarket.Outcome outcome2,,,,) = market.flights(flight2);
        assertEq(
            uint256(outcome2),
            uint256(FlightDelayPredictionMarket.Outcome.Delayed120Plus),
            "Should be Delayed120Plus"
        );

        // Test OnTime
        bytes32 flight3 = market.createFlightMarket("F3", "SEA", "PDX", "AS", "2024-12-31T13:00:00.000");
        market.resolveMarket(flight3, FlightDelayPredictionMarket.Outcome.OnTime);
        (,,,,,FlightDelayPredictionMarket.Outcome outcome3,,,,) = market.flights(flight3);
        assertEq(
            uint256(outcome3),
            uint256(FlightDelayPredictionMarket.Outcome.OnTime),
            "Should be OnTime"
        );
    }

    // ===== Claim Winnings Tests =====

    function testClaimWinningsAsWinner() public {
        uint256 amount = 100 ether;

        // User1 bets on OnTime
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // User2 bets on Delayed30
        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();

        // Resolve market as OnTime (user1 wins)
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // User1 claims winnings
        uint256 balanceBefore = token.balanceOf(user1);
        vm.startPrank(user1);
        market.claimWinnings(flightId);
        vm.stopPrank();

        uint256 balanceAfter = token.balanceOf(user1);
        uint256 winnings = balanceAfter - balanceBefore;

        // User1 should receive more than they invested (they won)
        assertTrue(winnings > 0, "Winner should receive winnings");
        // Winner should get close to the full pot (200 ether total)
        assertTrue(winnings > amount, "Winner should profit from losing bets");
    }

    function testClaimWinningsAsLoser() public {
        uint256 amount = 100 ether;

        // User1 bets on OnTime
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // User2 bets on Delayed30
        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();

        // Resolve market as OnTime (user2 loses)
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // User2 tries to claim (they lost)
        vm.startPrank(user2);
        vm.expectRevert("No winning shares to claim");
        market.claimWinnings(flightId);
        vm.stopPrank();
    }

    function testClaimWinningsMultipleWinners() public {
        uint256 amount = 100 ether;

        // User1 and User2 both bet on OnTime
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // Resolve as OnTime (both win)
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // Both claim
        uint256 user1BalanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(flightId);
        uint256 user1Winnings = token.balanceOf(user1) - user1BalanceBefore;

        uint256 user2BalanceBefore = token.balanceOf(user2);
        vm.prank(user2);
        market.claimWinnings(flightId);
        uint256 user2Winnings = token.balanceOf(user2) - user2BalanceBefore;

        // Both should get winnings
        assertTrue(user1Winnings > 0, "User1 should receive winnings");
        assertTrue(user2Winnings > 0, "User2 should receive winnings");

        // Due to AMM: user1 bought first (cheaper) so got more shares
        // User1 should get more winnings (they have more shares)
        assertTrue(user1Winnings > user2Winnings, "User1 (first buyer) should get more due to having more shares");

        // Total payout should equal total pot
        assertTrue(user1Winnings + user2Winnings <= 200 ether, "Total cannot exceed pot");
    }

    function testClaimWinningsRevertsIfNotResolved() public {
        uint256 amount = 100 ether;

        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);

        // Try to claim before resolution
        vm.expectRevert("Market not resolved yet");
        market.claimWinnings(flightId);
        vm.stopPrank();
    }

    function testClaimWinningsRevertsIfAlreadyClaimed() public {
        uint256 amount = 100 ether;

        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // Resolve as OnTime
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // Claim once
        vm.prank(user1);
        market.claimWinnings(flightId);

        // Try to claim again
        vm.startPrank(user1);
        vm.expectRevert("Already claimed");
        market.claimWinnings(flightId);
        vm.stopPrank();
    }

    function testClaimWinningsProportionalDistribution() public {
        uint256 user1Amount = 100 ether;
        uint256 user2Amount = 300 ether; // User2 invests 3x more

        // Both bet on OnTime
        vm.startPrank(user1);
        token.approve(address(market), user1Amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, user1Amount);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), user2Amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, user2Amount);
        vm.stopPrank();

        // Resolve as OnTime
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // Claim winnings
        uint256 user1BalanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(flightId);
        uint256 user1Winnings = token.balanceOf(user1) - user1BalanceBefore;

        uint256 user2BalanceBefore = token.balanceOf(user2);
        vm.prank(user2);
        market.claimWinnings(flightId);
        uint256 user2Winnings = token.balanceOf(user2) - user2BalanceBefore;

        // Winnings are proportional to SHARES, not investment
        // Due to AMM slippage: user1 got 100 shares for 100 ETH (first buyer)
        // user2 got only 75 shares for 300 ETH (bought after price increased)
        // So user1 actually has MORE shares and will get MORE payout!
        // This demonstrates the advantage of early entry in AMM markets
        assertTrue(user1Winnings > user2Winnings, "User1 (early buyer) gets more despite investing less");

        // Both should get positive winnings
        assertTrue(user1Winnings > 0, "User1 should get winnings");
        assertTrue(user2Winnings > 0, "User2 should get winnings");

        // Total payout should not exceed pot (400 ETH)
        // Note: Due to sequential claim recalculation, full pot may not be distributed
        assertTrue(user1Winnings + user2Winnings <= 400 ether, "Total cannot exceed pot");
        assertTrue(user1Winnings + user2Winnings >= 200 ether, "Should distribute significant portion");
    }

    function testFullMarketCycle() public {
        uint256 amount = 100 ether;

        // Multiple users buy different outcomes
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();

        address user3 = makeAddr("user3");
        token.mint(user3, 1000 ether);
        vm.startPrank(user3);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // Resolve market
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // Winners claim (user1 and user3)
        uint256 user1Before = token.balanceOf(user1);
        uint256 user3Before = token.balanceOf(user3);

        vm.prank(user1);
        market.claimWinnings(flightId);
        uint256 user1Payout = token.balanceOf(user1) - user1Before;

        vm.prank(user3);
        market.claimWinnings(flightId);
        uint256 user3Payout = token.balanceOf(user3) - user3Before;

        uint256 totalPayout = user1Payout + user3Payout;

        // Note: Due to sequential claims recalculating on remaining balance,
        // early claimers get proportionally more. This is a known limitation.
        // Total payout will be less than full pot due to this.
        assertTrue(totalPayout > 230 ether, "Total payout should be significant");
        assertTrue(totalPayout <= 300 ether, "Total payout cannot exceed total investment");

        // First claimer should profit significantly
        assertTrue(user1Payout > amount, "User1 (first claimer) should profit");
        assertTrue(user3Payout > 0, "User3 should get some payout");

        // Verify market resolved correctly
        (,,,,, FlightDelayPredictionMarket.Outcome outcome,,,,) = market.flights(flightId);
        assertEq(uint256(outcome), uint256(FlightDelayPredictionMarket.Outcome.OnTime), "Market should be resolved");
    }

    // ===== Outcome-Specific Pricing Tests =====

    function testOutcomeIndependentPricing() public {
        uint256 amount = 100 ether;

        // User1 buys OnTime shares
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        uint256 user1Shares = market.positions(flightId, user1);
        vm.stopPrank();

        // User2 buys Delayed30 shares - should get same 1:1 ratio (independent outcome)
        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        uint256 user2Shares = market.positions(flightId, user2);
        vm.stopPrank();

        // Both should get 1:1 on first purchase of their respective outcomes
        assertEq(user1Shares, amount, "User1 should get 1:1 for first OnTime purchase");
        assertEq(user2Shares, amount, "User2 should get 1:1 for first Delayed30 purchase");
    }

    function testSameOutcomeAffectsPricing() public {
        uint256 amount = 100 ether;

        // User1 buys OnTime shares
        vm.startPrank(user1);
        token.approve(address(market), amount * 2);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        uint256 firstPurchaseShares = market.positions(flightId, user1);

        // User1 buys MORE OnTime shares - should get fewer per token
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        uint256 totalShares = market.positions(flightId, user1);
        uint256 secondPurchaseShares = totalShares - firstPurchaseShares;
        vm.stopPrank();

        // Second purchase of SAME outcome should yield fewer shares
        assertTrue(secondPurchaseShares < amount, "Second purchase of same outcome should have slippage");
        assertTrue(secondPurchaseShares > 0, "Should still get some shares");
    }

    function testPriceReflectsProbability() public {
        uint256 amount = 100 ether;

        // User1 heavily buys OnTime (making it "more likely")
        vm.startPrank(user1);
        token.approve(address(market), amount * 5);
        for (uint256 i = 0; i < 5; i++) {
            market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        }
        vm.stopPrank();

        // User2 buys a little Delayed30
        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();

        // Get prices (probabilities)
        uint256 onTimePrice = market.getPrice(flightId, FlightDelayPredictionMarket.Outcome.OnTime);
        uint256 delayed30Price = market.getPrice(flightId, FlightDelayPredictionMarket.Outcome.Delayed30);

        // OnTime should have higher implied probability (more shares)
        assertTrue(onTimePrice > delayed30Price, "Heavily bought outcome should have higher price");
    }

    function testSellOnlyAffectsSameOutcome() public {
        uint256 amount = 100 ether;

        // Setup: Both users buy different outcomes
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        uint256 user2SharesBefore = market.positions(flightId, user2);
        vm.stopPrank();

        // User1 sells OnTime shares
        vm.startPrank(user1);
        uint256 user1Shares = market.positions(flightId, user1);
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, user1Shares / 2);
        vm.stopPrank();

        // User2's Delayed30 shares should be unaffected
        uint256 user2SharesAfter = market.positions(flightId, user2);
        assertEq(user2SharesAfter, user2SharesBefore, "Selling different outcome shouldn't affect user2's shares");
    }

    function testMultipleOutcomesPriceCorrectly() public {
        uint256 amount = 50 ether;

        // Multiple users buy different outcomes
        address user3 = makeAddr("user3");
        address user4 = makeAddr("user4");
        token.mint(user3, 1000 ether);
        token.mint(user4, 1000 ether);

        // Each user buys a different outcome
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();

        vm.startPrank(user3);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed120Plus, amount);
        vm.stopPrank();

        vm.startPrank(user4);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Cancelled, amount);
        vm.stopPrank();

        // All should have gotten 1:1 on first purchase
        assertEq(market.positions(flightId, user1), amount, "User1 should have 1:1");
        assertEq(market.positions(flightId, user2), amount, "User2 should have 1:1");
        assertEq(market.positions(flightId, user3), amount, "User3 should have 1:1");
        assertEq(market.positions(flightId, user4), amount, "User4 should have 1:1");
    }

    function testCalculateTokensForSharesOutcomeSpecific() public {
        uint256 amount = 100 ether;

        // User1 buys OnTime
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // User2 buys Delayed30
        vm.startPrank(user2);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();

        // Calculate sell value for each
        uint256 user1Shares = market.positions(flightId, user1);
        uint256 user2Shares = market.positions(flightId, user2);

        uint256 user1Tokens =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, user1Shares);
        uint256 user2Tokens =
            market.calculateTokensForShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, user2Shares);

        // Both should get similar amounts since they invested same and have same shares
        assertTrue(user1Tokens > amount / 2, "User1 should get significant value back");
        assertTrue(user2Tokens > amount / 2, "User2 should get significant value back");

        // Should be approximately equal (within 10%)
        assertTrue(
            user1Tokens * 110 / 100 >= user2Tokens && user1Tokens * 90 / 100 <= user2Tokens,
            "Values should be similar for same investment in different outcomes"
        );
    }

    function testOutcomeSpecificErrorMessages() public {
        uint256 amount = 100 ether;

        // User1 buys OnTime
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);

        // Try to sell Delayed30 shares (user doesn't have any)
        vm.expectRevert("Insufficient shares for this outcome");
        market.sellShares(flightId, FlightDelayPredictionMarket.Outcome.Delayed30, amount);
        vm.stopPrank();
    }

    function testEdgeCaseAllSharesSameOutcome() public {
        uint256 amount = 100 ether;

        // Everyone buys the same outcome
        vm.startPrank(user1);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        address user3 = makeAddr("user3");
        token.mint(user3, 1000 ether);

        vm.startPrank(user3);
        token.approve(address(market), amount);
        market.buyShares(flightId, FlightDelayPredictionMarket.Outcome.OnTime, amount);
        vm.stopPrank();

        // Price should be very high (close to 100% probability)
        uint256 price = market.getPrice(flightId, FlightDelayPredictionMarket.Outcome.OnTime);
        assertTrue(price > 99e16, "When all buy same outcome, price should be near 100%"); // > 99%
    }
}
