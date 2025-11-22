// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FlightDelayPredictionMarket} from "../src/FlightMarkets.sol";

contract FlightDelayPredictionMarketScript is Script {
    FlightDelayPredictionMarket public market;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // TODO: Replace with actual token address before deployment
        address tokenAddress = address(0x1234567890123456789012345678901234567890);
        market = new FlightDelayPredictionMarket(tokenAddress);

        vm.stopBroadcast();
    }
}
