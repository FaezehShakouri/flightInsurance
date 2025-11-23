// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";


contract FlightDelayPredictionMarketScript is Script {
    FlightDelayPredictionMarket public market;
    address public token = 0xf8eD259Fc6689328Dd7a04817cA8b89554dDA8af;
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        market = new FlightDelayPredictionMarket(address(token));

        console.log("Market address:", address(market));
        vm.stopBroadcast();
    }
}
