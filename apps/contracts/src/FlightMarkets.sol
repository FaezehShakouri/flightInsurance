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
    
    struct Flight {
        string flightNumber;
        string iataCode; // IATA code of the airport of departure
        string scheduledTime; // Date of the flight in YYYY-MM-DDThh:mm:ss.sss format compatible with oracle
        uint256 delayDuration; // Duration of the delay in minutes
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

    constructor() {
        owner = msg.sender;
        authorizedOracles[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "Only authorized oracles can call this function");
        _;
    }
    
    modifier marketActive(bytes32 flightId) {
        require(flights[flightId].outcome == Outcome.Unresolved, "Market not active");
        _;
    }

    function addOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = true;
    }

    function removeOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = false;
    }

    function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
        FEE_PERCENTAGE = newFeePercentage;
    }

    function setFeeDecimalPlaces(uint256 newFeeDecimalPlaces) external onlyOwner {
        FEE_DECIMAL_PLACES = newFeeDecimalPlaces;
    }

    function setMinLiquidity(uint256 newMinLiquidity) external onlyOwner {
        MIN_LIQUIDITY = newMinLiquidity;
    }

    
    
    
}