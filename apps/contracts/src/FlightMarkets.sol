// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

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

    address public token; // token used for trading 

    constructor(address _token) {
        owner = msg.sender;
        authorizedOracles[msg.sender] = true;
        token = _token;
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

    /**
     * @notice Buy shares for a specific outcome using AMM pricing
     * @param flightId The flight market identifier
     * @param outcome The outcome to buy shares for
     * @param amount The amount of tokens to spend
     */
    function buyShares(bytes32 flightId, Outcome outcome, uint256 amount) 
        external 
        marketActive(flightId) 
    {
        require(outcome != Outcome.Unresolved, "Cannot buy unresolved outcome");
        require(amount > 0, "Amount must be greater than 0");

        Flight storage flight = flights[flightId];
        
        // Calculate shares to mint based on AMM pricing
        uint256 sharesToMint = calculateSharesForAmount(flightId, outcome, amount);
        require(sharesToMint > 0, "Amount too small");

        // Transfer tokens from user to contract
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        // Update the outcome pool
        uint256 currentShares = _getOutcomeShares(flight, outcome);
        _updateOutcomeShares(flight, outcome, currentShares + sharesToMint);
        
        // Update user's position
        positions[flightId][msg.sender] += sharesToMint;
    }

    /**
     * @notice Calculate how many shares will be received for a given amount using constant product formula
     * @dev Uses simplified AMM: shares = amount * (1 + currentShares) / price
     */
    function calculateSharesForAmount(bytes32 flightId, Outcome outcome, uint256 amount) 
        public 
        view 
        returns (uint256) 
    {
        Flight storage flight = flights[flightId];
        uint256 totalShares = _getTotalShares(flight);
        
        // Initialize market with minimum liquidity if empty
        if (totalShares == 0) {
            return amount;
        }

        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        
        // Constant product AMM: k = x * y
        // For multi-outcome: simplified pricing based on relative share distribution
        // shares_to_mint = amount * total_shares / (total_value + amount)
        uint256 k = totalShares * contractBalance;
        uint256 newTotalValue = contractBalance + amount;
        uint256 newTotalShares = k / newTotalValue;
        
        return totalShares - newTotalShares;
    }

    /**
     * @notice Get the current price for buying shares of a specific outcome
     * @param flightId The flight market identifier
     * @param outcome The outcome to get price for
     * @return price The price per share (scaled by 1e18)
     */
    function getPrice(bytes32 flightId, Outcome outcome) 
        external 
        view 
        returns (uint256) 
    {
        Flight storage flight = flights[flightId];
        uint256 totalShares = _getTotalShares(flight);
        
        if (totalShares == 0) {
            // Equal probability for all outcomes initially (1/6 = ~16.67%)
            return 166666666666666666; // ~16.67% probability per outcome
        }

        uint256 outcomeShares = _getOutcomeShares(flight, outcome);
        // Price = share of total pool (probability)
        return (outcomeShares * 1e18) / totalShares;
    }

    // Internal helper functions
    function _getTotalShares(Flight storage flight) internal view returns (uint256) {
        return flight.totalOnTimeShares + 
               flight.totalCancelledShares + 
               flight.totalDelayed30Shares + 
               flight.totalDelayed60Shares + 
               flight.totalDelayed90Shares + 
               flight.totalDelayed120PlusShares;
    }

    function _getOutcomeShares(Flight storage flight, Outcome outcome) internal view returns (uint256) {
        if (outcome == Outcome.OnTime) return flight.totalOnTimeShares;
        if (outcome == Outcome.Cancelled) return flight.totalCancelledShares;
        if (outcome == Outcome.Delayed30) return flight.totalDelayed30Shares;
        if (outcome == Outcome.Delayed60) return flight.totalDelayed60Shares;
        if (outcome == Outcome.Delayed90) return flight.totalDelayed90Shares;
        if (outcome == Outcome.Delayed120Plus) return flight.totalDelayed120PlusShares;
        return 0;
    }

    function _updateOutcomeShares(Flight storage flight, Outcome outcome, uint256 newShares) internal {
        if (outcome == Outcome.OnTime) flight.totalOnTimeShares = newShares;
        else if (outcome == Outcome.Cancelled) flight.totalCancelledShares = newShares;
        else if (outcome == Outcome.Delayed30) flight.totalDelayed30Shares = newShares;
        else if (outcome == Outcome.Delayed60) flight.totalDelayed60Shares = newShares;
        else if (outcome == Outcome.Delayed90) flight.totalDelayed90Shares = newShares;
        else if (outcome == Outcome.Delayed120Plus) flight.totalDelayed120PlusShares = newShares;
    }
}
