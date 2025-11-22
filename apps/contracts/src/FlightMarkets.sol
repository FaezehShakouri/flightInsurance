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
        Delayed120Plus,
        Cancelled
    }

    struct Flight {
        string flightNumber;
        string departureCode; // code of the departure airport (e.g. "LAX")
        string destinationCode; // code of the destination airport (e.g. "JFK")
        string airlineCode; // code of the airline (e.g. "AA")
        string scheduledTime; // Date of the flight in YYYY-MM-DDThh:mm:ss.sss format compatible with oracle
        Outcome outcome;
        uint256 totalOnTimeShares;
        uint256 totalCancelledShares;
        uint256 totalDelayed30Shares;
        uint256 totalDelayed120PlusShares;
    }

    mapping(bytes32 flightId => Flight) public flights;
    mapping(bytes32 lightId => mapping(address user => uint256 shares)) public positions;
    mapping(bytes32 flightId => mapping(address user => mapping(Outcome outcome => uint256 shares))) public
        outcomePositions;
    mapping(bytes32 flightId => mapping(address user => bool claimed)) public hasClaimed;
    mapping(address oracle => bool authorized) public authorizedOracles;

    bytes32[] public flightIds;
    address public owner;
    uint256 public feePercentage = 2; // 2% trading fee
    uint256 public feeDecimalPlaces = 14;
    uint256 public minLiquidity = 1000 wei;

    address public token; // token used for trading

    // Events
    event MarketResolved(bytes32 indexed flightId, Outcome outcome);
    event WinningsClaimed(bytes32 indexed flightId, address indexed user, uint256 payout);
    event SharesPurchased(
        bytes32 indexed flightId, address indexed user, Outcome outcome, uint256 shares, uint256 amount
    );
    event SharesSold(bytes32 indexed flightId, address indexed user, Outcome outcome, uint256 shares, uint256 amount);

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

    function createFlightMarket(
        string memory flightNumber,
        string memory departureCode,
        string memory destinationCode,
        string memory airlineCode,
        string memory scheduledTime
    ) external onlyOwner returns (bytes32) {
        // todo: should not allow to create market after scheduled time
        bytes32 flightId = keccak256(abi.encodePacked(flightNumber, departureCode, destinationCode, airlineCode, scheduledTime));
        require(flights[flightId].outcome == Outcome.Unresolved, "Flight market already exists");
        flights[flightId] = Flight({
            flightNumber: flightNumber,
            departureCode: departureCode,
            destinationCode: destinationCode,
            airlineCode: airlineCode,
            scheduledTime: scheduledTime,
            outcome: Outcome.Unresolved,
            totalOnTimeShares: 0,
            totalCancelledShares: 0,
            totalDelayed30Shares: 0,
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
    function buyShares(bytes32 flightId, Outcome outcome, uint256 amount) external marketActive(flightId) {
        require(outcome != Outcome.Unresolved, "Cannot buy unresolved outcome");
        require(amount > 0, "Amount must be greater than 0");

        Flight storage flight = flights[flightId];

        // Calculate shares to mint based on AMM pricing
        uint256 sharesToMint = calculateSharesForAmount(flightId, outcome, amount);
        require(sharesToMint > 0, "Amount too small");

        // Transfer tokens from user to contract
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        // Update the outcome pool
        uint256 currentShares = _getOutcomeShares(flight, outcome);
        _updateOutcomeShares(flight, outcome, currentShares + sharesToMint);

        // Update user's positions (both total and outcome-specific)
        positions[flightId][msg.sender] += sharesToMint;
        outcomePositions[flightId][msg.sender][outcome] += sharesToMint;

        emit SharesPurchased(flightId, msg.sender, outcome, sharesToMint, amount);
    }

    /**
     * @notice Sell shares for a specific outcome and receive tokens using AMM pricing
     * @param flightId The flight market identifier
     * @param outcome The outcome to sell shares for
     * @param sharesToSell The number of shares to sell
     */
    function sellShares(bytes32 flightId, Outcome outcome, uint256 sharesToSell) external marketActive(flightId) {
        require(outcome != Outcome.Unresolved, "Cannot sell unresolved outcome");
        require(sharesToSell > 0, "Shares must be greater than 0");
        require(outcomePositions[flightId][msg.sender][outcome] >= sharesToSell, "Insufficient shares for this outcome");

        Flight storage flight = flights[flightId];
        uint256 currentOutcomeShares = _getOutcomeShares(flight, outcome);
        require(currentOutcomeShares >= sharesToSell, "Insufficient outcome shares in pool");

        // Calculate tokens to return based on AMM pricing
        uint256 tokensToReturn = calculateTokensForShares(flightId, outcome, sharesToSell);
        require(tokensToReturn > 0, "Shares too small");

        // Update the outcome pool (reduce shares)
        _updateOutcomeShares(flight, outcome, currentOutcomeShares - sharesToSell);

        // Update user's positions (both total and outcome-specific)
        positions[flightId][msg.sender] -= sharesToSell;
        outcomePositions[flightId][msg.sender][outcome] -= sharesToSell;

        // Transfer tokens from contract to user
        require(IERC20(token).transfer(msg.sender, tokensToReturn), "Token transfer failed");

        emit SharesSold(flightId, msg.sender, outcome, sharesToSell, tokensToReturn);
    }

    /**
     * @notice Calculate how many shares will be received for a given amount using outcome-specific bonding curve
     * @dev Uses proportional pricing based on the specific outcome's liquidity
     */
    function calculateSharesForAmount(bytes32 flightId, Outcome outcome, uint256 amount) public view returns (uint256) {
        Flight storage flight = flights[flightId];
        uint256 outcomeShares = _getOutcomeShares(flight, outcome);

        // Initialize market with 1:1 ratio if this is the first purchase for this outcome
        if (outcomeShares == 0) {
            return amount;
        }

        // Get total liquidity allocated to this specific outcome
        // We estimate this as proportional to the shares in this outcome
        uint256 totalShares = _getTotalShares(flight);
        uint256 contractBalance = IERC20(token).balanceOf(address(this));

        // Estimate liquidity for this outcome based on its share of total
        uint256 outcomeLiquidity = totalShares > 0 ? (outcomeShares * contractBalance) / totalShares : 0;

        // Proportional bonding curve for this specific outcome
        // shares_out = (amount * outcome_shares) / (outcome_liquidity + amount)
        return (amount * outcomeShares) / (outcomeLiquidity + amount);
    }

    /**
     * @notice Calculate how many tokens will be received for selling shares (outcome-specific)
     * @param flightId The flight market identifier
     * @param outcome The outcome to sell shares for
     * @param sharesToSell The number of shares to sell
     * @return tokensToReturn The amount of tokens that will be received
     */
    function calculateTokensForShares(bytes32 flightId, Outcome outcome, uint256 sharesToSell)
        public
        view
        returns (uint256)
    {
        Flight storage flight = flights[flightId];
        uint256 outcomeShares = _getOutcomeShares(flight, outcome);

        require(outcomeShares > 0, "No shares for this outcome");
        require(sharesToSell <= outcomeShares, "Cannot sell more than outcome shares");

        uint256 totalShares = _getTotalShares(flight);
        uint256 contractBalance = IERC20(token).balanceOf(address(this));

        // Estimate liquidity for this outcome based on its share of total
        uint256 outcomeLiquidity = (outcomeShares * contractBalance) / totalShares;

        // If selling all shares of this outcome, return all its liquidity
        if (sharesToSell == outcomeShares) {
            return outcomeLiquidity;
        }

        // Proportional return with bonding curve for this specific outcome
        // tokens_out = outcome_liquidity * shares_to_sell / (outcome_shares + shares_to_sell)
        return (sharesToSell * outcomeLiquidity) / (outcomeShares + sharesToSell);
    }

    /**
     * @notice Resolve a flight market with the actual outcome
     * @param flightId The flight market identifier
     * @param actualOutcome The actual outcome of the flight
     */
    function resolveMarket(bytes32 flightId, Outcome actualOutcome) external onlyOracle {
        Flight storage flight = flights[flightId];
        require(flight.outcome == Outcome.Unresolved, "Market already resolved");
        require(actualOutcome != Outcome.Unresolved, "Cannot resolve to Unresolved");

        flight.outcome = actualOutcome;

        emit MarketResolved(flightId, actualOutcome);
    }

    /**
     * @notice Claim winnings for a resolved market
     * @param flightId The flight market identifier
     */
    function claimWinnings(bytes32 flightId) external {
        Flight storage flight = flights[flightId];
        require(flight.outcome != Outcome.Unresolved, "Market not resolved yet");
        require(!hasClaimed[flightId][msg.sender], "Already claimed");

        // Get user's shares for the winning outcome
        uint256 userWinningShares = outcomePositions[flightId][msg.sender][flight.outcome];
        require(userWinningShares > 0, "No winning shares to claim");

        // Mark as claimed first (reentrancy protection)
        hasClaimed[flightId][msg.sender] = true;

        // Calculate payout based on winning outcome
        uint256 totalWinningShares = _getOutcomeShares(flight, flight.outcome);
        uint256 contractBalance = IERC20(token).balanceOf(address(this));

        // Payout = (user's winning shares / total winning shares) * total pool
        // Winners split the entire pot proportionally
        uint256 payout = (userWinningShares * contractBalance) / totalWinningShares;

        // Reset user's winning position
        outcomePositions[flightId][msg.sender][flight.outcome] = 0;

        // Transfer payout
        require(IERC20(token).transfer(msg.sender, payout), "Payout transfer failed");

        emit WinningsClaimed(flightId, msg.sender, payout);
    }

    /**
     * @notice Get the current price for buying shares of a specific outcome
     * @param flightId The flight market identifier
     * @param outcome The outcome to get price for
     * @return price The price per share (scaled by 1e18)
     */
    function getPrice(bytes32 flightId, Outcome outcome) external view returns (uint256) {
        Flight storage flight = flights[flightId];
        uint256 totalShares = _getTotalShares(flight);

        if (totalShares == 0) {
            // Equal probability for all outcomes initially (1/4 = 25%)
            return 250000000000000000; // 25% probability per outcome
        }

        uint256 outcomeShares = _getOutcomeShares(flight, outcome);
        // Price = share of total pool (probability)
        return (outcomeShares * 1e18) / totalShares;
    }

    // Internal helper functions
    function _getTotalShares(Flight storage flight) internal view returns (uint256) {
        return flight.totalOnTimeShares + flight.totalCancelledShares + flight.totalDelayed30Shares
            + flight.totalDelayed120PlusShares;
    }

    function _getOutcomeShares(Flight storage flight, Outcome outcome) internal view returns (uint256) {
        if (outcome == Outcome.OnTime) return flight.totalOnTimeShares;
        if (outcome == Outcome.Cancelled) return flight.totalCancelledShares;
        if (outcome == Outcome.Delayed30) return flight.totalDelayed30Shares;
        if (outcome == Outcome.Delayed120Plus) return flight.totalDelayed120PlusShares;
        return 0;
    }

    function _updateOutcomeShares(Flight storage flight, Outcome outcome, uint256 newShares) internal {
        if (outcome == Outcome.OnTime) flight.totalOnTimeShares = newShares;
        else if (outcome == Outcome.Cancelled) flight.totalCancelledShares = newShares;
        else if (outcome == Outcome.Delayed30) flight.totalDelayed30Shares = newShares;
        else if (outcome == Outcome.Delayed120Plus) flight.totalDelayed120PlusShares = newShares;
    }

    // View functions for getting all flight information

    struct FlightInfo {
        bytes32 flightId;
        string flightNumber;
        string departureCode;
        string destinationCode;
        string airlineCode;
        string scheduledTime;
        Outcome outcome;
        uint256 totalOnTimeShares;
        uint256 totalCancelledShares;
        uint256 totalDelayed30Shares;
        uint256 totalDelayed120PlusShares;
        uint256 onTimeProbability; // scaled by 1e18
        uint256 cancelledProbability; // scaled by 1e18
        uint256 delayed30Probability; // scaled by 1e18
        uint256 delayed120PlusProbability; // scaled by 1e18
    }

    /**
     * @notice Get all flights with their details and probabilities
     * @return allFlights Array of FlightInfo structs containing all flight data
     */
    function getAllFlights() external view returns (FlightInfo[] memory) {
        FlightInfo[] memory allFlights = new FlightInfo[](flightIds.length);

        for (uint256 i = 0; i < flightIds.length; i++) {
            bytes32 flightId = flightIds[i];
            Flight storage flight = flights[flightId];
            uint256 totalShares = _getTotalShares(flight);

            // Calculate probabilities
            uint256 onTimeProb;
            uint256 cancelledProb;
            uint256 delayed30Prob;
            uint256 delayed120PlusProb;

            if (totalShares == 0) {
                // Equal probability for all outcomes initially (1/4 = 25%)
                onTimeProb = 250000000000000000;
                cancelledProb = 250000000000000000;
                delayed30Prob = 250000000000000000;
                delayed120PlusProb = 250000000000000000;
            } else {
                onTimeProb = (flight.totalOnTimeShares * 1e18) / totalShares;
                cancelledProb = (flight.totalCancelledShares * 1e18) / totalShares;
                delayed30Prob = (flight.totalDelayed30Shares * 1e18) / totalShares;
                delayed120PlusProb = (flight.totalDelayed120PlusShares * 1e18) / totalShares;
            }

            allFlights[i] = FlightInfo({
                flightId: flightId,
                flightNumber: flight.flightNumber,
                departureCode: flight.departureCode,
                destinationCode: flight.destinationCode,
                airlineCode: flight.airlineCode,
                scheduledTime: flight.scheduledTime,
                outcome: flight.outcome,
                totalOnTimeShares: flight.totalOnTimeShares,
                totalCancelledShares: flight.totalCancelledShares,
                totalDelayed30Shares: flight.totalDelayed30Shares,
                totalDelayed120PlusShares: flight.totalDelayed120PlusShares,
                onTimeProbability: onTimeProb,
                cancelledProbability: cancelledProb,
                delayed30Probability: delayed30Prob,
                delayed120PlusProbability: delayed120PlusProb
            });
        }

        return allFlights;
    }

    /**
     * @notice Get specific flight info with probabilities
     * @param flightId The flight market identifier
     * @return info FlightInfo struct containing flight data and probabilities
     */
    function getFlightInfo(bytes32 flightId) external view returns (FlightInfo memory) {
        Flight storage flight = flights[flightId];
        require(flight.outcome != Outcome.Unresolved || bytes(flight.flightNumber).length > 0, "Flight does not exist");

        uint256 totalShares = _getTotalShares(flight);

        // Calculate probabilities
        uint256 onTimeProb;
        uint256 cancelledProb;
        uint256 delayed30Prob;
        uint256 delayed120PlusProb;

        if (totalShares == 0) {
            // Equal probability for all outcomes initially (1/4 = 25%)
            onTimeProb = 250000000000000000;
            cancelledProb = 250000000000000000;
            delayed30Prob = 250000000000000000;
            delayed120PlusProb = 250000000000000000;
        } else {
            onTimeProb = (flight.totalOnTimeShares * 1e18) / totalShares;
            cancelledProb = (flight.totalCancelledShares * 1e18) / totalShares;
            delayed30Prob = (flight.totalDelayed30Shares * 1e18) / totalShares;
            delayed120PlusProb = (flight.totalDelayed120PlusShares * 1e18) / totalShares;
        }

        return FlightInfo({
            flightId: flightId,
            flightNumber: flight.flightNumber,
            departureCode: flight.departureCode,
            destinationCode: flight.destinationCode,
            airlineCode: flight.airlineCode,
            scheduledTime: flight.scheduledTime,
            outcome: flight.outcome,
            totalOnTimeShares: flight.totalOnTimeShares,
            totalCancelledShares: flight.totalCancelledShares,
            totalDelayed30Shares: flight.totalDelayed30Shares,
            totalDelayed120PlusShares: flight.totalDelayed120PlusShares,
            onTimeProbability: onTimeProb,
            cancelledProbability: cancelledProb,
            delayed30Probability: delayed30Prob,
            delayed120PlusProbability: delayed120PlusProb
        });
    }

    /**
     * @notice Get the total number of flights
     * @return count The number of flight markets created
     */
    function getFlightCount() external view returns (uint256) {
        return flightIds.length;
    }
}
