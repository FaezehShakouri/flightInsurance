// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";

contract FlightDelayPredictionMarketTest is Test {
    FlightDelayPredictionMarket public market;
    address public mockToken;

    function setUp() public {
        // Deploy with a mock token address for testing
        mockToken = address(0x1234567890123456789012345678901234567890);
        market = new FlightDelayPredictionMarket(mockToken);
    }
}
