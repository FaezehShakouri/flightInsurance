// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";

contract FlightDelayPredictionMarketScript is Script {
    FlightDelayPredictionMarket public market;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        market = new FlightDelayPredictionMarket();

        vm.stopBroadcast();
    }
}
