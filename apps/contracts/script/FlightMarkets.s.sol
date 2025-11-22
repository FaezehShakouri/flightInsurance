// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";


contract FlightDelayPredictionMarketScript is Script {
    FlightDelayPredictionMarket public market;
    address public token = 0x33cb2dc2D031cb13a13A120ACFA60ff4e5B418DF;
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        market = new FlightDelayPredictionMarket(address(token));

        console.log("Market address:", address(market));
        vm.stopBroadcast();
    }
}
