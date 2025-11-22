// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title FlightDelayPredictionMarket
 * @notice A prediction market for trading probabilities of flight delays
 * @dev Uses an AMM (Automated Market Maker) model for price discovery
 */
contract FlightDelayPredictionMarket {
    // Market outcomes
    enum Outcome { Unresolved, OnTime, Delayed30, Delayed60, Delayed90, Delayed120Plus, Cancelled }
    
    // Market status
    enum MarketStatus { Active, Locked, Resolved }

    struct Flight {
        string flightNumber;
        string iataCode; // IATA code of the airport of departure
        string scheduledTime; // Date of the flight in YYYY-MM-DDThh:mm:ss.sss format compatible with oracle
        uint256 delayDuration; // Duration of the delay in minutes
        MarketStatus status; // Active, Locked, Resolved
        Outcome outcome;
        uint256 totalOnTimeShares;
        uint256 totalCancelledShares;
        uint256 totalDelayed30Shares;
        uint256 totalDelayed60Shares;
        uint256 totalDelayed90Shares;
        uint256 totalDelayed120PlusShares;
    }

    mapping(bytes32 indexed flightId => Flight) public flights;
    mapping(bytes32 indexed flightId => mapping(address indexed user => Position)) public positions;
    mapping(address indexed oracle => bool authorized) public authorizedOracles;

    bytes32[] public flightIds;
    address public owner;
    uint256 public constant FEE_PERCENTAGE = 2; // 2% trading fee
    uint256 public constant FEE_DECIMAL_PLACES = 14;
    uint256 public constant MIN_LIQUIDITY = 1000 wei;

    constructor() {}
}