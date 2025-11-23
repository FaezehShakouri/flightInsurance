// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title FlightDelayPredictionMarket
 * @notice Order book style prediction market where users can buy/sell YES or NO shares
 * @dev For each outcome: YES price + NO price = 1
 *      If YES price is 0.3, NO price is 0.7
 *      Winners get $1 per share
 */
contract FlightDelayPredictionMarket {
    enum Outcome {
        Unresolved,
        OnTime,
        Delayed30,
        Delayed120Plus,
        Cancelled
    }

    enum Position {
        YES,
        NO
    }

    struct Flight {
        string flightNumber;
        string departureCode;
        string destinationCode;
        string airlineCode;
        string scheduledTime;
        Outcome outcome;
        // Track YES and NO shares for each outcome
        uint256 onTimeYesShares;
        uint256 onTimeNoShares;
        uint256 delayed30YesShares;
        uint256 delayed30NoShares;
        uint256 delayed120PlusYesShares;
        uint256 delayed120PlusNoShares;
        uint256 cancelledYesShares;
        uint256 cancelledNoShares;
    }

    // User positions: flightId => user => outcome => position (YES/NO) => shares
    mapping(bytes32 => mapping(address => mapping(Outcome => mapping(Position => uint256)))) public positions;
    mapping(bytes32 => Flight) public flights;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;
    mapping(address => bool) public authorizedOracles;

    bytes32[] public flightIds;
    address public owner;
    address public token;

    event MarketCreated(bytes32 indexed flightId, string flightNumber);
    event MarketResolved(bytes32 indexed flightId, Outcome outcome);
    event WinningsClaimed(bytes32 indexed flightId, address indexed user, uint256 payout);
    event SharesPurchased(
        bytes32 indexed flightId,
        address indexed user,
        Outcome outcome,
        Position position,
        uint256 shares,
        uint256 cost,
        uint256 pricePerShare
    );
    event SharesSold(
        bytes32 indexed flightId,
        address indexed user,
        Outcome outcome,
        Position position,
        uint256 shares,
        uint256 payout,
        uint256 pricePerShare
    );

    constructor(address _token) {
        owner = msg.sender;
        authorizedOracles[msg.sender] = true;
        token = _token;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "Only oracle");
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

    function calculateFlightId(
        string memory flightNumber,
        string memory departureCode,
        string memory destinationCode,
        string memory airlineCode,
        string memory scheduledTime
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(flightNumber, departureCode, destinationCode, airlineCode, scheduledTime));
    }

    function createFlightMarket(
        string memory flightNumber,
        string memory departureCode,
        string memory destinationCode,
        string memory airlineCode,
        string memory scheduledTime
    ) external returns (bytes32) {
        bytes32 flightId = calculateFlightId(flightNumber, departureCode, destinationCode, airlineCode, scheduledTime);
        require(bytes(flights[flightId].flightNumber).length == 0, "Market exists");

        flights[flightId] = Flight({
            flightNumber: flightNumber,
            departureCode: departureCode,
            destinationCode: destinationCode,
            airlineCode: airlineCode,
            scheduledTime: scheduledTime,
            outcome: Outcome.Unresolved,
            onTimeYesShares: 0,
            onTimeNoShares: 0,
            delayed30YesShares: 0,
            delayed30NoShares: 0,
            delayed120PlusYesShares: 0,
            delayed120PlusNoShares: 0,
            cancelledYesShares: 0,
            cancelledNoShares: 0
        });

        flightIds.push(flightId);
        emit MarketCreated(flightId, flightNumber);
        return flightId;
    }

    /**
     * @notice Buy YES or NO shares for an outcome
     * @param position YES = betting FOR the outcome, NO = betting AGAINST
     * @dev If buying YES at 0.3, cost = shares * 0.3
     *      If buying NO at 0.7, cost = shares * 0.7
     *      Note: YES price + NO price must equal 1.0
     */
    function buyShares(
        bytes32 flightId,
        Outcome outcome,
        Position position,
        uint256 sharesToBuy,
        uint256 pricePerShare
    ) external marketActive(flightId) {
        require(outcome != Outcome.Unresolved, "Invalid outcome");
        require(sharesToBuy > 0, "Shares must be > 0");
        require(pricePerShare > 0 && pricePerShare < 1e18, "Price must be 0-1");

        // Calculate cost
        uint256 cost = (sharesToBuy * pricePerShare) / 1e18;
        require(cost > 0, "Cost too small");

        // Transfer tokens
        require(IERC20(token).transferFrom(msg.sender, address(this), cost), "Transfer failed");

        // Update shares
        Flight storage flight = flights[flightId];
        _updateShares(flight, outcome, position, _getShares(flight, outcome, position) + sharesToBuy);

        // Update user position
        positions[flightId][msg.sender][outcome][position] += sharesToBuy;

        emit SharesPurchased(flightId, msg.sender, outcome, position, sharesToBuy, cost, pricePerShare);
    }

    /**
     * @notice Sell YES or NO shares
     */
    function sellShares(
        bytes32 flightId,
        Outcome outcome,
        Position position,
        uint256 sharesToSell,
        uint256 pricePerShare
    ) external marketActive(flightId) {
        require(outcome != Outcome.Unresolved, "Invalid outcome");
        require(sharesToSell > 0, "Shares must be > 0");
        require(pricePerShare > 0 && pricePerShare < 1e18, "Price must be 0-1");
        require(positions[flightId][msg.sender][outcome][position] >= sharesToSell, "Insufficient shares");

        // Calculate payout
        uint256 payout = (sharesToSell * pricePerShare) / 1e18;
        require(payout > 0, "Payout too small");
        require(IERC20(token).balanceOf(address(this)) >= payout, "Insufficient balance");

        // Update shares
        Flight storage flight = flights[flightId];
        _updateShares(flight, outcome, position, _getShares(flight, outcome, position) - sharesToSell);

        // Update user position
        positions[flightId][msg.sender][outcome][position] -= sharesToSell;

        // Transfer tokens
        require(IERC20(token).transfer(msg.sender, payout), "Transfer failed");

        emit SharesSold(flightId, msg.sender, outcome, position, sharesToSell, payout, pricePerShare);
    }

    /**
     * @notice Resolve market
     */
    function resolveMarket(bytes32 flightId, Outcome actualOutcome) external {
        Flight storage flight = flights[flightId];
        require(flight.outcome == Outcome.Unresolved, "Already resolved");
        require(actualOutcome != Outcome.Unresolved, "Invalid outcome");

        flight.outcome = actualOutcome;
        emit MarketResolved(flightId, actualOutcome);
    }

    /**
     * @notice Claim winnings
     * @dev If you hold YES shares for the winning outcome, you win
     *      If you hold NO shares for any losing outcome, you win
     */
    function claimWinnings(bytes32 flightId) external {
        Flight storage flight = flights[flightId];
        require(flight.outcome != Outcome.Unresolved, "Not resolved");
        require(!hasClaimed[flightId][msg.sender], "Already claimed");

        uint256 totalPayout = 0;

        // Check YES position for winning outcome
        uint256 yesShares = positions[flightId][msg.sender][flight.outcome][Position.YES];
        if (yesShares > 0) {
            totalPayout += yesShares; // Each YES share pays $1
            positions[flightId][msg.sender][flight.outcome][Position.YES] = 0;
        }

        // Check NO positions for all losing outcomes
        Outcome[4] memory allOutcomes = [
            Outcome.OnTime,
            Outcome.Delayed30,
            Outcome.Delayed120Plus,
            Outcome.Cancelled
        ];

        for (uint256 i = 0; i < 4; i++) {
            if (allOutcomes[i] != flight.outcome) {
                uint256 noShares = positions[flightId][msg.sender][allOutcomes[i]][Position.NO];
                if (noShares > 0) {
                    totalPayout += noShares; // Each NO share pays $1 if outcome didn't happen
                    positions[flightId][msg.sender][allOutcomes[i]][Position.NO] = 0;
                }
            }
        }

        require(totalPayout > 0, "No winning shares");
        hasClaimed[flightId][msg.sender] = true;

        require(IERC20(token).transfer(msg.sender, totalPayout), "Transfer failed");
        emit WinningsClaimed(flightId, msg.sender, totalPayout);
    }

    /**
     * @notice Calculate cost to buy shares
     */
    function calculateBuyCost(uint256 shares, uint256 price) public pure returns (uint256) {
        require(price <= 1e18, "Price > 1");
        return (shares * price) / 1e18;
    }

    /**
     * @notice Calculate payout for selling shares
     */
    function calculateSellPayout(uint256 shares, uint256 price) public pure returns (uint256) {
        require(price <= 1e18, "Price > 1");
        return (shares * price) / 1e18;
    }

    /**
     * @notice Get implied YES price for an outcome
     * @dev Price = YES shares / (YES shares + NO shares)
     */
    function getPrice(bytes32 flightId, Outcome outcome, Position position) public view returns (uint256) {
        if (outcome == Outcome.Unresolved) return 0;

        Flight storage flight = flights[flightId];
        uint256 yesShares = _getShares(flight, outcome, Position.YES);
        uint256 noShares = _getShares(flight, outcome, Position.NO);
        uint256 totalShares = yesShares + noShares;

        if (totalShares == 0) {
            // Default to 50/50
            return position == Position.YES ? 500000000000000000 : 500000000000000000; // 0.5 * 1e18
        }

        if (position == Position.YES) {
            return (yesShares * 1e18) / totalShares;
        } else {
            return (noShares * 1e18) / totalShares;
        }
    }

    // Internal helpers
    function _getShares(Flight storage flight, Outcome outcome, Position position) internal view returns (uint256) {
        if (outcome == Outcome.OnTime) {
            return position == Position.YES ? flight.onTimeYesShares : flight.onTimeNoShares;
        } else if (outcome == Outcome.Delayed30) {
            return position == Position.YES ? flight.delayed30YesShares : flight.delayed30NoShares;
        } else if (outcome == Outcome.Delayed120Plus) {
            return position == Position.YES ? flight.delayed120PlusYesShares : flight.delayed120PlusNoShares;
        } else if (outcome == Outcome.Cancelled) {
            return position == Position.YES ? flight.cancelledYesShares : flight.cancelledNoShares;
        }
        return 0;
    }

    function _updateShares(Flight storage flight, Outcome outcome, Position position, uint256 newShares) internal {
        if (outcome == Outcome.OnTime) {
            if (position == Position.YES) flight.onTimeYesShares = newShares;
            else flight.onTimeNoShares = newShares;
        } else if (outcome == Outcome.Delayed30) {
            if (position == Position.YES) flight.delayed30YesShares = newShares;
            else flight.delayed30NoShares = newShares;
        } else if (outcome == Outcome.Delayed120Plus) {
            if (position == Position.YES) flight.delayed120PlusYesShares = newShares;
            else flight.delayed120PlusNoShares = newShares;
        } else if (outcome == Outcome.Cancelled) {
            if (position == Position.YES) flight.cancelledYesShares = newShares;
            else flight.cancelledNoShares = newShares;
        }
    }

    // View functions
    struct OutcomeInfo {
        uint256 yesShares;
        uint256 noShares;
        uint256 yesPrice;
        uint256 noPrice;
    }

    struct FlightInfo {
        bytes32 flightId;
        string flightNumber;
        string departureCode;
        string destinationCode;
        string airlineCode;
        string scheduledTime;
        Outcome outcome;
        OutcomeInfo onTime;
        OutcomeInfo delayed30;
        OutcomeInfo delayed120Plus;
        OutcomeInfo cancelled;
    }

    function getAllFlights() external view returns (FlightInfo[] memory) {
        FlightInfo[] memory allFlights = new FlightInfo[](flightIds.length);

        for (uint256 i = 0; i < flightIds.length; i++) {
            allFlights[i] = _getFlightInfo(flightIds[i]);
        }

        return allFlights;
    }

    function getFlightInfo(bytes32 flightId) external view returns (FlightInfo memory) {
        require(bytes(flights[flightId].flightNumber).length > 0, "Flight not found");
        return _getFlightInfo(flightId);
    }

    function _getFlightInfo(bytes32 flightId) internal view returns (FlightInfo memory) {
        Flight storage flight = flights[flightId];

        return FlightInfo({
            flightId: flightId,
            flightNumber: flight.flightNumber,
            departureCode: flight.departureCode,
            destinationCode: flight.destinationCode,
            airlineCode: flight.airlineCode,
            scheduledTime: flight.scheduledTime,
            outcome: flight.outcome,
            onTime: _getOutcomeInfo(flight, Outcome.OnTime),
            delayed30: _getOutcomeInfo(flight, Outcome.Delayed30),
            delayed120Plus: _getOutcomeInfo(flight, Outcome.Delayed120Plus),
            cancelled: _getOutcomeInfo(flight, Outcome.Cancelled)
        });
    }

    function _getOutcomeInfo(Flight storage flight, Outcome outcome) internal view returns (OutcomeInfo memory) {
        uint256 yesShares = _getShares(flight, outcome, Position.YES);
        uint256 noShares = _getShares(flight, outcome, Position.NO);
        uint256 totalShares = yesShares + noShares;

        uint256 yesPrice;
        uint256 noPrice;

        if (totalShares == 0) {
            yesPrice = 500000000000000000; // 0.5
            noPrice = 500000000000000000; // 0.5
        } else {
            yesPrice = (yesShares * 1e18) / totalShares;
            noPrice = (noShares * 1e18) / totalShares;
        }

        return OutcomeInfo({
            yesShares: yesShares,
            noShares: noShares,
            yesPrice: yesPrice,
            noPrice: noPrice
        });
    }

    function getFlightCount() external view returns (uint256) {
        return flightIds.length;
    }

    function getUserPosition(
        bytes32 flightId,
        address user,
        Outcome outcome,
        Position position
    ) external view returns (uint256) {
        return positions[flightId][user][outcome][position];
    }
}
