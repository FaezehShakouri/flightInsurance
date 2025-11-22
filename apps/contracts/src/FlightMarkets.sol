// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title FlightDelayPredictionMarket
 * @notice A prediction market for trading probabilities of flight delays
 * @dev Uses an AMM (Automated Market Maker) model for price discovery
 */
contract FlightDelayPredictionMarket {
    // Market outcomes
    enum Outcome { Unresolved, OnTime, Delayed30, Delayed60, Delayed90, Delayed120Plus }
    
    // Market status
    enum MarketStatus { Active, Locked, Resolved }
}