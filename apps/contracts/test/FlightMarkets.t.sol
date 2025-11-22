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
}
