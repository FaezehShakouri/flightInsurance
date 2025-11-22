// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title FlightDelayPredictionMarket
 * @notice A prediction market for trading probabilities of flight delays
 * @dev Uses an AMM (Automated Market Maker) model for price discovery
 */
contract FlightDelayPredictionMarket {
    // Market outcomes
    enum Outcome {
        Unresolved,
        OnTime,
        Delayed30,
        Delayed60,
        Delayed90,
        Delayed120Plus,
        Cancelled
    }

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

    mapping(bytes32 flightId => Flight) public flights;
    mapping(bytes32 lightId => mapping(address user => uint256 shares)) public positions;
    mapping(address oracle => bool authorized) public authorizedOracles;

    bytes32[] public flightIds;
    address public owner;
    uint256 public feePercentage = 2; // 2% trading fee
    uint256 public feeDecimalPlaces = 14;
    uint256 public minLiquidity = 1000 wei;

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
        feePercentage = newFeePercentage;
    }

    function setFeeDecimalPlaces(uint256 newFeeDecimalPlaces) external onlyOwner {
        feeDecimalPlaces = newFeeDecimalPlaces;
    }

    function setMinLiquidity(uint256 newMinLiquidity) external onlyOwner {
        minLiquidity = newMinLiquidity;
    }

    function createFlightMarket(string memory flightNumber, string memory iataCode, string memory scheduledTime)
        external
        onlyOwner
        returns (bytes32)
    {
        // todo: should not allow to create market after scheduled time
        bytes32 flightId = keccak256(abi.encodePacked(flightNumber, iataCode, scheduledTime));
        require(flights[flightId].outcome == Outcome.Unresolved, "Flight market already exists");
        flights[flightId] = Flight({
            flightNumber: flightNumber,
            iataCode: iataCode,
            scheduledTime: scheduledTime,
            delayDuration: 0, // will be set by oracle after flight is completed
            outcome: Outcome.Unresolved,
            totalOnTimeShares: 0,
            totalCancelledShares: 0,
            totalDelayed30Shares: 0,
            totalDelayed60Shares: 0,
            totalDelayed90Shares: 0,
            totalDelayed120PlusShares: 0
        });
        flightIds.push(flightId);
        return flightId;
    }

    function updateFlightOutcome(bytes32 flightId, uint256 delayDuration) external onlyOracle marketActive(flightId) {
        require(delayDuration > 0, "Delay duration must be greater than 0");
        flights[flightId].delayDuration = delayDuration;
        if (delayDuration <= 30) {
            flights[flightId].outcome = Outcome.Delayed30;
        } else if (delayDuration <= 60) {
            flights[flightId].outcome = Outcome.Delayed60;
        } else if (delayDuration <= 90) {
            flights[flightId].outcome = Outcome.Delayed90;
        } else if (delayDuration <= 120) {
            flights[flightId].outcome = Outcome.Delayed120Plus;
        } else {
            flights[flightId].outcome = Outcome.Cancelled;
        }
    }
}
