// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";

contract FlightDelayPredictionMarketTest is Test {
    FlightDelayPredictionMarket public market;

    function setUp() public {
        market = new FlightDelayPredictionMarket();
    }
}
