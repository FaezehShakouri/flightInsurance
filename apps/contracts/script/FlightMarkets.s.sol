// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";


contract FlightDelayPredictionMarketScript is Script {
    FlightDelayPredictionMarket public market;
    // address public token = 0xf8eD259Fc6689328Dd7a04817cA8b89554dDA8af;
    address public token = 0x22b054128AEf0643149Af8b0cD77DA123C70B3C8;
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        market = new FlightDelayPredictionMarket(address(token));

        console.log("Market address:", address(market));
        vm.stopBroadcast();
    }
}
