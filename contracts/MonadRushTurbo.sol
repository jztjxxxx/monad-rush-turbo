// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MonadRushTurbo
 * @notice High-speed binary prediction game with dynamic pari-mutuel odds,
 *         accumulated jackpot, win streaks, and 10s Lightning Rounds.
 *         Optimized for Monad's 400ms block time and sub-second finality.
 */
contract MonadRushTurbo {
    enum Position { None, Up, Down }

    struct BetInfo {
        Position position;
        uint256 amount;
        bool claimed;
    }

    struct Round {
        uint256 roundId;
        uint256 startTimestamp;
        uint256 lockTimestamp;
        uint256 closeTimestamp;
        int64 lockPrice;
        int64 closePrice;
        uint256 totalAmount;
        uint256 upAmount;
        uint256 downAmount;
        uint256 rewardBaseCalAmount;
        uint256 rewardAmount;
        Position winner;
        bool resolved;
        bool isLightning;
    }

    address public owner;
    address public operator;

    uint256 public currentRoundId;
    uint256 public constant JACKPOT_FEE_BPS = 500; // 5% fee to Jackpot pool
    uint256 public constant STREAK_3_BONUS_BPS = 2000; // 20% of jackpot pool
    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant MIN_BET_LIGHTNING = 0.002 ether;
    uint256 public standardRoundDuration = 30; // 30 seconds standard
    uint256 public lightningRoundDuration = 10; // 10 seconds lightning

    uint256 public totalJackpotPool;
    
    // User stats
    mapping(address => uint256) public winStreaks;
    mapping(address => uint256) public highestStreak;
    mapping(address => uint256) public totalWinnings;

    // Rounds & Bets
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => BetInfo)) public ledger;
    mapping(address => uint256[]) public userRounds;

    event RoundStarted(uint256 indexed roundId, uint256 startTimestamp, uint256 closeTimestamp, int64 lockPrice, bool isLightning);
    event BetPlaced(address indexed user, uint256 indexed roundId, Position position, uint256 amount);
    event RoundEnded(uint256 indexed roundId, int64 closePrice, Position winner, uint256 rewardAmount);
    event Claimed(address indexed user, uint256 indexed roundId, uint256 amount, uint256 streakBonus);
    event JackpotHit(address indexed user, uint256 streak, uint256 jackpotAmount);
    event LightningTriggered(uint256 indexed roundId, uint256 duration, int64 lockPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "Not operator");
        _;
    }

    constructor(int64 initialPrice) {
        owner = msg.sender;
        operator = msg.sender;
        _startRound(false, initialPrice);
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function _startRound(bool isLightning, int64 lockPrice) internal {
        currentRoundId++;
        uint256 duration = isLightning ? lightningRoundDuration : standardRoundDuration;

        Round storage r = rounds[currentRoundId];
        r.roundId = currentRoundId;
        r.startTimestamp = block.timestamp;
        r.lockTimestamp = block.timestamp + (duration * 2 / 3);
        r.closeTimestamp = block.timestamp + duration;
        r.lockPrice = lockPrice;
        r.isLightning = isLightning;

        emit RoundStarted(currentRoundId, r.startTimestamp, r.closeTimestamp, lockPrice, isLightning);
    }

    /**
     * @notice Place a bet on UP
     */
    function betUp(uint256 roundId) external payable {
        _bet(roundId, Position.Up);
    }

    /**
     * @notice Place a bet on DOWN
     */
    function betDown(uint256 roundId) external payable {
        _bet(roundId, Position.Down);
    }

    function _bet(uint256 roundId, Position position) internal {
        require(roundId == currentRoundId, "Round not active");
        Round storage r = rounds[roundId];
        require(block.timestamp < r.lockTimestamp, "Betting locked");

        uint256 minBet = r.isLightning ? MIN_BET_LIGHTNING : MIN_BET;
        require(msg.value >= minBet, "Bet below minimum");

        BetInfo storage bet = ledger[roundId][msg.sender];
        require(bet.position == Position.None, "Already bet this round");

        bet.position = position;
        bet.amount = msg.value;

        r.totalAmount += msg.value;
        if (position == Position.Up) {
            r.upAmount += msg.value;
        } else {
            r.downAmount += msg.value;
        }

        userRounds[msg.sender].push(roundId);
        emit BetPlaced(msg.sender, roundId, position, msg.value);
    }

    /**
     * @notice Operator triggers resolution and immediately begins next round with nextLockPrice
     */
    function executeRound(int64 closePrice, int64 nextLockPrice, bool nextIsLightning) external onlyOperator {
        Round storage r = rounds[currentRoundId];
        require(!r.resolved, "Round already resolved");
        require(block.timestamp >= r.lockTimestamp, "Round not closed");

        r.closePrice = closePrice;
        r.resolved = true;

        if (r.upAmount == 0 || r.downAmount == 0) {
            // Draw / refund because one side had no bets; NO fee
            r.winner = Position.None;
            r.rewardBaseCalAmount = r.totalAmount;
            r.rewardAmount = r.totalAmount;
        } else {
            // Determine winner based on price movement
            if (closePrice > r.lockPrice) {
                r.winner = Position.Up;
                r.rewardBaseCalAmount = r.upAmount;
            } else if (closePrice < r.lockPrice) {
                r.winner = Position.Down;
                r.rewardBaseCalAmount = r.downAmount;
            } else {
                r.winner = Position.None;
                r.rewardBaseCalAmount = r.totalAmount;
            }

            if (r.winner == Position.None) {
                // Exact tie: Draw, NO 5% fee charged
                r.rewardAmount = r.totalAmount;
            } else {
                // Fee calculation (5% to jackpot only when winner exists)
                uint256 fee = (r.totalAmount * JACKPOT_FEE_BPS) / 10000;
                totalJackpotPool += fee;
                r.rewardAmount = r.totalAmount - fee;
            }
        }

        emit RoundEnded(currentRoundId, closePrice, r.winner, r.rewardAmount);

        // Start next round with nextLockPrice
        _startRound(nextIsLightning, nextLockPrice);
    }

    /**
     * @notice Allows demo or operator to trigger an immediate 10-second Lightning Round
     */
    function triggerLightningRound(int64 currentPrice) external onlyOperator {
        if (!rounds[currentRoundId].resolved) {
            // Force settle current and spin up lightning
            Round storage r = rounds[currentRoundId];
            r.closePrice = currentPrice;
            r.resolved = true;
            r.winner = Position.None; // safety refund
            r.rewardAmount = r.totalAmount; // Draw, no fee
        }
        _startRound(true, currentPrice);
        emit LightningTriggered(currentRoundId, lightningRoundDuration, currentPrice);
    }

    /**
     * @notice Claim payout and streak bonuses
     * @dev Allows losers to claim with 0 payout: cleans streak and marks claimed without reverting or transferring.
     */
    function claim(uint256 roundId) external {
        Round storage r = rounds[roundId];
        require(r.resolved, "Round not resolved");

        BetInfo storage bet = ledger[roundId][msg.sender];
        require(!bet.claimed, "Already claimed");
        require(bet.amount > 0, "No bet");

        bet.claimed = true;
        uint256 payout = 0;
        uint256 streakBonus = 0;

        if (r.winner == Position.None) {
            // Refund
            payout = bet.amount;
        } else if (bet.position == r.winner) {
            // Dynamic pari-mutuel calculation
            payout = (bet.amount * r.rewardAmount) / r.rewardBaseCalAmount;
            
            // Update win streak
            winStreaks[msg.sender]++;
            if (winStreaks[msg.sender] > highestStreak[msg.sender]) {
                highestStreak[msg.sender] = winStreaks[msg.sender];
            }

            // Check streak bonus
            if (winStreaks[msg.sender] == 3 && totalJackpotPool > 0) {
                streakBonus = (totalJackpotPool * STREAK_3_BONUS_BPS) / 10000;
                totalJackpotPool -= streakBonus;
                emit JackpotHit(msg.sender, 3, streakBonus);
            } else if (winStreaks[msg.sender] >= 5 && totalJackpotPool > 0) {
                streakBonus = totalJackpotPool; // Empty entire jackpot!
                totalJackpotPool = 0;
                winStreaks[msg.sender] = 0; // reset after grand jackpot
                emit JackpotHit(msg.sender, 5, streakBonus);
            }
        } else {
            // Lost - reset streak; payout remains 0
            winStreaks[msg.sender] = 0;
        }

        uint256 totalPayout = payout + streakBonus;
        if (totalPayout > 0) {
            totalWinnings[msg.sender] += totalPayout;
            (bool sent, ) = msg.sender.call{value: totalPayout}("");
            require(sent, "Transfer failed");
        }

        emit Claimed(msg.sender, roundId, payout, streakBonus);
    }

    /**
     * @notice Get dynamic odds and pool stats for frontend tug-of-war
     */
    function getRoundStats(uint256 roundId) external view returns (
        uint256 upPool,
        uint256 downPool,
        uint256 totalPool,
        uint256 upOddsBps,
        uint256 downOddsBps,
        uint256 upPercentage,
        bool isLightning,
        uint256 timeLeft,
        int64 lockPrice,
        int64 closePrice,
        Position winner,
        bool resolved
    ) {
        Round storage r = rounds[roundId];
        upPool = r.upAmount;
        downPool = r.downAmount;
        totalPool = r.totalAmount;
        isLightning = r.isLightning;
        timeLeft = block.timestamp < r.closeTimestamp ? r.closeTimestamp - block.timestamp : 0;
        lockPrice = r.lockPrice;
        closePrice = r.closePrice;
        winner = r.winner;
        resolved = r.resolved;

        if (totalPool == 0) {
            upOddsBps = 20000; // default 2.0x
            downOddsBps = 20000;
            upPercentage = 50;
        } else {
            upPercentage = (upPool * 100) / (totalPool > 0 ? totalPool : 1);
            // 95% distributable after 5% jackpot
            uint256 netPool = totalPool * (10000 - JACKPOT_FEE_BPS) / 10000;
            upOddsBps = upPool > 0 ? (netPool * 10000) / upPool : 20000;
            downOddsBps = downPool > 0 ? (netPool * 10000) / downPool : 20000;
        }
    }

    function getUserRoundBet(uint256 roundId, address user) external view returns (
        Position position,
        uint256 amount,
        bool claimed
    ) {
        BetInfo storage bet = ledger[roundId][user];
        return (bet.position, bet.amount, bet.claimed);
    }

    receive() external payable {
        totalJackpotPool += msg.value;
    }
}
