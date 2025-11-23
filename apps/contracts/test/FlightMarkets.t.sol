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

        token = new MockERC20();
        market = new FlightDelayPredictionMarket(address(token));

        token.mint(user1, 10000 ether);
        token.mint(user2, 10000 ether);

        flightId = market.createFlightMarket("AA100", "JFK", "LAX", "AA", "2024-12-25T10:00:00.000");
    }

    function testCreateFlightMarket() public {
        bytes32 newFlightId = market.createFlightMarket("UA200", "LAX", "ORD", "UA", "2024-12-26T15:30:00.000");
        FlightDelayPredictionMarket.FlightInfo memory info = market.getFlightInfo(newFlightId);

        assertEq(info.flightNumber, "UA200");
        assertEq(info.departureCode, "LAX");
        assertEq(info.destinationCode, "ORD");
    }

    function testBuyYesShares() public {
        uint256 shares = 100 ether;
        uint256 price = 0.30 ether; // 30% chance

        uint256 cost = market.calculateBuyCost(shares, price);
        assertEq(cost, 30 ether, "Cost should be 100 * 0.30 = 30");

        vm.startPrank(user1);
        token.approve(address(market), cost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            shares,
            price
        );
        vm.stopPrank();

        uint256 userPosition = market.getUserPosition(
            flightId,
            user1,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES
        );
        assertEq(userPosition, shares, "User should have 100 YES shares");
    }

    function testBuyNoShares() public {
        uint256 shares = 50 ether;
        uint256 price = 0.70 ether; // 70% chance it WON'T happen

        uint256 cost = market.calculateBuyCost(shares, price);
        assertEq(cost, 35 ether, "Cost should be 50 * 0.70 = 35");

        vm.startPrank(user1);
        token.approve(address(market), cost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.NO,
            shares,
            price
        );
        vm.stopPrank();

        uint256 userPosition = market.getUserPosition(
            flightId,
            user1,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.NO
        );
        assertEq(userPosition, shares, "User should have 50 NO shares");
    }

    function testYesAndNoSharesTogether() public {
        uint256 yesShares = 100 ether;
        uint256 yesPrice = 0.30 ether;
        uint256 noShares = 50 ether;
        uint256 noPrice = 0.70 ether;

        // User1 buys YES
        uint256 yesCost = market.calculateBuyCost(yesShares, yesPrice);
        vm.startPrank(user1);
        token.approve(address(market), yesCost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            yesShares,
            yesPrice
        );
        vm.stopPrank();

        // User2 buys NO
        uint256 noCost = market.calculateBuyCost(noShares, noPrice);
        vm.startPrank(user2);
        token.approve(address(market), noCost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.NO,
            noShares,
            noPrice
        );
        vm.stopPrank();

        // Verify positions
        assertEq(
            market.getUserPosition(flightId, user1, FlightDelayPredictionMarket.Outcome.OnTime, FlightDelayPredictionMarket.Position.YES),
            yesShares
        );
        assertEq(
            market.getUserPosition(flightId, user2, FlightDelayPredictionMarket.Outcome.OnTime, FlightDelayPredictionMarket.Position.NO),
            noShares
        );
    }

    function testSellYesShares() public {
        uint256 shares = 100 ether;
        uint256 buyPrice = 0.25 ether;
        uint256 sellPrice = 0.30 ether;

        // Buy first
        uint256 buyCost = market.calculateBuyCost(shares, buyPrice);
        vm.startPrank(user1);
        token.approve(address(market), buyCost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            shares,
            buyPrice
        );

        // Sell at higher price
        uint256 sharesToSell = 50 ether;
        uint256 expectedPayout = market.calculateSellPayout(sharesToSell, sellPrice);
        assertEq(expectedPayout, 15 ether, "Payout should be 50 * 0.30 = 15");

        uint256 balanceBefore = token.balanceOf(user1);
        market.sellShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            sharesToSell,
            sellPrice
        );
        uint256 balanceAfter = token.balanceOf(user1);
        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, expectedPayout, "Should receive payout");
        assertEq(
            market.getUserPosition(flightId, user1, FlightDelayPredictionMarket.Outcome.OnTime, FlightDelayPredictionMarket.Position.YES),
            50 ether,
            "Should have 50 shares left"
        );
    }

    function testClaimWinningsYesPosition() public {
        uint256 shares = 100 ether;
        uint256 price = 0.30 ether;

        // User1 buys YES on OnTime
        uint256 cost = market.calculateBuyCost(shares, price);
        vm.startPrank(user1);
        token.approve(address(market), cost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            shares,
            price
        );
        vm.stopPrank();

        // Resolve as OnTime
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // User1 claims
        uint256 balanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(flightId);
        uint256 balanceAfter = token.balanceOf(user1);

        // Should get $1 per YES share
        assertEq(balanceAfter - balanceBefore, shares, "Should win $100 (100 shares * $1)");
    }

    function testClaimWinningsNoPosition() public {
        uint256 shares = 50 ether;
        uint256 price = 0.70 ether;

        // User1 buys NO on OnTime (betting it WON'T be on time)
        uint256 cost = market.calculateBuyCost(shares, price);
        vm.startPrank(user1);
        token.approve(address(market), cost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.NO,
            shares,
            price
        );
        vm.stopPrank();

        // Resolve as Delayed30 (NOT OnTime, so NO wins)
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.Delayed30);

        // User1 claims
        uint256 balanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(flightId);
        uint256 balanceAfter = token.balanceOf(user1);

        // Should get $1 per NO share (because OnTime didn't happen)
        assertEq(balanceAfter - balanceBefore, shares, "Should win $50 (50 NO shares * $1)");
    }

    function testLoserCannotClaim() public {
        // User1 buys YES on OnTime
        vm.startPrank(user1);
        token.approve(address(market), 30 ether);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            100 ether,
            0.30 ether
        );
        vm.stopPrank();

        // Resolve as Delayed30 (User1 loses)
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.Delayed30);

        // User1 tries to claim
        vm.startPrank(user1);
        vm.expectRevert("No winning shares");
        market.claimWinnings(flightId);
        vm.stopPrank();
    }

    function testMultipleOutcomesWithNoShares() public {
        // User1 buys NO on multiple outcomes
        // If ANY of them doesn't happen, user wins

        // NO on OnTime at 60%
        vm.startPrank(user1);
        token.approve(address(market), 200 ether);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.NO,
            50 ether,
            0.60 ether
        );

        // NO on Cancelled at 80%
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.Cancelled,
            FlightDelayPredictionMarket.Position.NO,
            30 ether,
            0.80 ether
        );
        vm.stopPrank();

        // Resolve as Delayed30
        // User wins on both NO positions (OnTime didn't happen, Cancelled didn't happen)
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.Delayed30);

        uint256 balanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(flightId);
        uint256 balanceAfter = token.balanceOf(user1);

        // Should win 50 + 30 = 80 tokens
        assertEq(balanceAfter - balanceBefore, 80 ether, "Should win $80 from two NO positions");
    }

    function testProfitScenario() public {
        uint256 shares = 100 ether;
        uint256 price = 0.20 ether;
        uint256 cost = 20 ether;

        // User buys YES at 20%
        vm.startPrank(user1);
        token.approve(address(market), cost);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            shares,
            price
        );
        vm.stopPrank();

        // Resolve as OnTime
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        // Claim
        uint256 balanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(flightId);
        uint256 balanceAfter = token.balanceOf(user1);

        uint256 winnings = balanceAfter - balanceBefore;
        assertEq(winnings, 100 ether, "Should win $100");

        uint256 profit = winnings - cost;
        assertEq(profit, 80 ether, "Net profit should be $80");
    }

    function testGetPrice() public {
        // Initial prices should be 50/50
        uint256 yesPrice = market.getPrice(flightId, FlightDelayPredictionMarket.Outcome.OnTime, FlightDelayPredictionMarket.Position.YES);
        uint256 noPrice = market.getPrice(flightId, FlightDelayPredictionMarket.Outcome.OnTime, FlightDelayPredictionMarket.Position.NO);

        assertEq(yesPrice, 0.5 ether, "Initial YES price should be 50%");
        assertEq(noPrice, 0.5 ether, "Initial NO price should be 50%");

        // Buy some YES shares
        vm.startPrank(user1);
        token.approve(address(market), 30 ether);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            100 ether,
            0.30 ether
        );
        vm.stopPrank();

        // YES price should increase
        uint256 newYesPrice = market.getPrice(flightId, FlightDelayPredictionMarket.Outcome.OnTime, FlightDelayPredictionMarket.Position.YES);
        assertTrue(newYesPrice > yesPrice, "YES price should increase after buying");
    }

    function testCannotBuyAfterResolution() public {
        market.resolveMarket(flightId, FlightDelayPredictionMarket.Outcome.OnTime);

        vm.startPrank(user1);
        token.approve(address(market), 30 ether);
        vm.expectRevert("Market not active");
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            100 ether,
            0.30 ether
        );
        vm.stopPrank();
    }

    function testGetAllFlights() public {
        market.createFlightMarket("DL456", "ATL", "MIA", "DL", "2024-12-30T14:00:00.000");

        FlightDelayPredictionMarket.FlightInfo[] memory flights = market.getAllFlights();
        assertEq(flights.length, 2, "Should have 2 flights");
        assertEq(flights[0].flightNumber, "AA100");
        assertEq(flights[1].flightNumber, "DL456");
    }

    function testCalculations() public {
        uint256 shares = 100 ether;
        uint256 price = 0.35 ether;

        uint256 cost = market.calculateBuyCost(shares, price);
        assertEq(cost, 35 ether, "Cost should be 100 * 0.35");

        uint256 payout = market.calculateSellPayout(shares, price);
        assertEq(payout, 35 ether, "Payout should be 100 * 0.35");
    }

    function testPriceValidation() public {
        vm.startPrank(user1);
        token.approve(address(market), 200 ether);
        
        // Try price > 1
        vm.expectRevert("Price must be 0-1");
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            100 ether,
            1.5 ether
        );
        vm.stopPrank();
    }

    function testFlightInfo() public {
        // Buy some shares to create market activity
        vm.startPrank(user1);
        token.approve(address(market), 100 ether);
        market.buyShares(
            flightId,
            FlightDelayPredictionMarket.Outcome.OnTime,
            FlightDelayPredictionMarket.Position.YES,
            100 ether,
            0.30 ether
        );
        vm.stopPrank();

        FlightDelayPredictionMarket.FlightInfo memory info = market.getFlightInfo(flightId);
        
        assertEq(info.onTime.yesShares, 100 ether, "Should have 100 YES shares");
        assertEq(info.onTime.noShares, 0, "Should have 0 NO shares");
        assertTrue(info.onTime.yesPrice > 0, "YES price should be > 0");
        // Since there are only YES shares and no NO shares, NO price will be 0
        // In real usage, this would balance out as people buy NO shares too
    }
}
