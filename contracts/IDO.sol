// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract IDO is Pausable, Ownable, ReentrancyGuard {
    /*
     * ERC20 token to be sold, this IDO contract will receive the those tokens to be sold
     * This receiving transaction is expected to be done before the IDO starts, by the token owner
     */
    IERC20 public token;

    /*
     * Token price in wei
     */
    uint256 public tokenPrice;

    /*
     * This is the maximum amount an investor can contribute in the IDO, measured in wei. It is implemented to prevent whales
     * from buying a significant portion, thus ensuring a fair distribution and avoiding centralization of token ownership.
     */
    uint256 public minContribution;
    uint256 public maxContribution;

    /*
     * The soft cap is the minimum amount the project aims to raise. If the IDO fails to gather this amount,
     * it is considered unsuccessful and the collected funds will be automatically be refunded to the investors.
     * For example, if the softCap is 50 ETH, but the IDO only raises 40 ETH, the project will refund the collected Ether.
     */
    uint256 public softCap;
    bool public reachedSoftCap;

    /*
     * The hard cap is the absolute maximum amount the project wants to raise. Once the IDO reaches this amount,
     * it will call the finalizeIdo() function and the IDO will be considered successful.
     */
    uint256 public hardCap;
    bool public reachedHardCap;

    /*
     * Duration of the IDO in days. This is the time window in which the IDO will be active and accepting contributions.
     */
    uint256 public investingPhaseStart;
    uint256 public investingPhaseDuration;

    /*
     * Amount of native currency raised in the IDO. This is the sum of all the contributions made by all the investors.
     */
    uint256 public totalRaised;

    /*
     * Structure to hold the information of each investor contribution
     * - totalContribution: Total amount of native currency contributed by the investor
     * - totalTokensBought: Total amount of project tokens bought by the investor
     * - totalTokensClaimed: Total amount of project tokens claimed by the investor
     */
    struct VestedInvestment {
        uint256 totalContribution;
        uint256 totalTokensBought;
        uint256 totalTokensClaimed;
    }

    /*
     * Mapping of each investor investment in the IDO with it's Vested Investment structure.
     */
    mapping(address => VestedInvestment) public vestedInvestments;

    /*
     * Array to keep track of the investors addresses
     */
    address[] public investors;

    /*
     * Returns the number of investors
     */
    function investorsLength() public view returns (uint256 length) {
        return investors.length;
    }

    /*
     * - cliffDuration: Duration in days after which the vesting starts
     * - cliffStart: Date from which the cliffDuration is calculated (IDO finalization with totalRaised >= softCap)
     * - vestingPeriodsPassed: Number of vesting periods passed
     * - vestingTotalPeriods: Total number of vesting periods
     * - vestingPeriodDuration: Duration in days of each vesting period
     * - vestingPeriodPercentage: Percentage of tokens to be vested in each vesting period
     * Note that vestingTotalPeriods * vestingPeriodPercentage should be equal to 100
     */
    uint256 public vestingCliffDuration;
    uint256 public vestingCliffStart;
    uint256 public vestingPeriodsPassed;
    uint256 public vestingTotalPeriods;
    uint256 public vestingPeriodDuration;
    uint256 public vestingPeriodPercentage;

    /*
     * The IDO can be in one of the following states:
     * - Preparing: The IDO is being set up and can only accept token contributions from the project owner
     * - Active: The IDO is active and accepting contributions
     * - Refunded: The IDO has finalized and the soft cap has not been reached. The collected funds have been refunded to the investors automatically.
     * - Completed: The IDO has finalized and the soft cap has been reached. The collected funds have been transferred to the project owner and the Cliff + Vesting Schedule has started.
     */
    enum State {
        Preparing,
        Active,
        Refunded,
        Completed
    }
    State public state;

    /*
     * Events to keep track of important IDO state changes and transactions
     */
    event StateActive(uint256 totalTokensFunded);
    event StateCompleted(uint256 totalRaised);
    event StateRefunded(uint256 totalRefunded);

    event ReachedSoftCap(uint256 softCap);
    event ReachedHardCap(uint256 hardCap);

    event FinalizeIdoCalled(uint256 totalRaised);

    event Invested(
        address indexed investor,
        uint256 contribution,
        uint256 tokensBought
    );

    event DeliveredVestedTokens(
        address indexed investor,
        uint256 tokensDelivered
    );

    event Refunded(
        address indexed investor,
        uint256 contribution,
        uint256 tokensBought
    );

    /*
     * Constructor function
     */
    constructor(
        address _tokenAddress,
        uint256 _tokenPrice,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _investingPhaseInDays,
        uint256 _vestingCliffInDays,
        uint256 _vestingTotalPeriods,
        uint256 _vestingPeriodInDays,
        uint256 _vestingPeriodPercentage
    ) Ownable(msg.sender) {
        require(_softCap <= _hardCap, "Soft cap should be less than hard cap");
        require(
            _minContribution <= _maxContribution,
            "Min contribution should be less than max contribution"
        );
        require(
            _vestingTotalPeriods * _vestingPeriodPercentage == 100,
            "Vesting period percentage should be equal to 100"
        );

        token = IERC20(_tokenAddress);
        tokenPrice = _tokenPrice;
        minContribution = _minContribution;
        maxContribution = _maxContribution;
        softCap = _softCap;
        hardCap = _hardCap;
        investingPhaseDuration = _investingPhaseInDays * 1 days;
        vestingCliffDuration = _vestingCliffInDays * 1 days;
        vestingTotalPeriods = _vestingTotalPeriods;
        vestingPeriodDuration = _vestingPeriodInDays * 1 days;
        vestingPeriodPercentage = _vestingPeriodPercentage;
        state = State.Preparing;
    }

    /*
     * Pausability functionality inherited from OpenZeppelin Pausable contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /*
     * State modifiers to ensure valid states for each function call
     */
    modifier whenPreparing() {
        require(state == State.Preparing, "IDO is not in Preparing State");
        _;
    }

    modifier whenActive() {
        require(state == State.Active, "IDO is not in Active State");
        _;
    }

    modifier whenCompleted() {
        require(state == State.Completed, "IDO is not in Completed State");
        _;
    }

    /*
     * Start the IDO after the project tokens have been transferred to this contract.
     * This will set the contract as Active and start the investing phase.
     */
    function activateIdo() external whenPreparing onlyOwner {
        uint256 tokenBalance = token.balanceOf(address(this));
        require(tokenBalance > 0, "IDO contract has no tokens to sell");
        state = State.Active;
        investingPhaseStart = block.timestamp;
        emit StateActive(tokenBalance);
    }

    /*
     * This first version of the investing function works with native currency contributions.
     * The investor executes this method, and receives the corresponding amount of tokens following the Vesting Schedule.
     * @TBD: Accept ERC20 tokens as contributions.
     * @TBD: Accept Multi-Chain ERC20 contributions, thanks to Chainlink CCIP
     */
    function invest() external payable whenActive whenNotPaused nonReentrant {
        uint256 investmentValue = msg.value;

        require(
            investmentValue >= minContribution &&
                investmentValue <= maxContribution,
            "Investment amount out of permitted range"
        );

        require(
            vestedInvestments[msg.sender].totalContribution + investmentValue <=
                maxContribution,
            "New total contribution exceeds personal limit"
        );

        if (!reachedSoftCap && totalRaised + investmentValue >= softCap) {
            reachedSoftCap = true;
            emit ReachedSoftCap(softCap);
        }

        if (!reachedHardCap && totalRaised + investmentValue >= hardCap) {
            reachedHardCap = true;
            emit ReachedHardCap(hardCap);

            // Refund the excess amount to the investor
            uint256 excessValue = totalRaised + investmentValue - hardCap;
            investmentValue = investmentValue - excessValue;
            payable(msg.sender).transfer(excessValue);

            // _finalizeIdo();
        }

        uint256 tokensToBuy = investmentValue / tokenPrice;

        require(
            token.balanceOf(address(this)) >= tokensToBuy,
            "Not enough tokens in the contract to process the investment"
        );

        if (vestedInvestments[msg.sender].totalContribution == 0) {
            investors.push(msg.sender);
        }

        vestedInvestments[msg.sender].totalContribution += investmentValue;
        vestedInvestments[msg.sender].totalTokensBought += tokensToBuy;
        totalRaised += investmentValue;

        emit Invested(msg.sender, investmentValue, tokensToBuy);
    }

    /*
     * Potential callers:
     * - A execution of invest() that surpasses the hardcap.
     * - A Chainlink Automation when the investingPhaseDuration has finished.
     *
     * Execution branches:
     * - If the soft cap has been reached, the IDO is considered successful,
     *   the Cliff + Vesting Schedule starts and the project owner receives the collected funds.
     * - If the soft cap has not been reached, the IDO is considered unsuccessful, the collected funds
     *   are refunded to the investors and the project owner receives all the project tokens back.
     */
    function _finalizeIDO() internal whenActive whenNotPaused {
        if (reachedSoftCap) {
            state = State.Completed;
            vestingCliffStart = block.timestamp;

            emit StateCompleted(totalRaised);

            // Transfer the collected native currency to the project owner
            payable(owner()).transfer(address(this).balance);

            // Transfer the left over project tokens to the project owner
            uint256 tokenBalance = token.balanceOf(address(this));
            if (tokenBalance > 0) {
                token.transfer(owner(), tokenBalance);
            }
        } else {
            // @TBD
            // _refundInvestors();
        }

        emit FinalizeIdoCalled(totalRaised);
    }

    /*
     * Check if the investing phase has finished
     */
    function investingPhaseHasFinished() public view returns (bool) {
        return (block.timestamp >=
            investingPhaseStart + investingPhaseDuration);
    }

    /*
     * Check if a vesting payment is ready to be performed
     */

    function vestingPaymentIsReady() public view returns (bool) {
        // If all the vesting periods have passed, no more payments have to be done
        // @TBD This could be handeled more clearly with a new "VestingFinished" state
        if (vestingPeriodsPassed == vestingTotalPeriods) {
            return false;
        }
        uint256 vestingPhaseStart = vestingCliffStart + vestingCliffDuration;
        uint256 currentVestingPeriod = vestingPeriodsPassed + 1;

        /*
         * With a Investing Phase of 30 days, Cliff duration of 30 days, and Vesting Periods of 30 days:
         * - The first payment would be done (Cliff + Vesting Period 1) after the IDO finalization (30 + 30 = 60 days)
         * - The second payment would be done (Cliff + Vesting Period 1 + Vesting Period 2) after the IDO finalization (90 days)
         */
        uint256 currentPeriodPayDate = vestingPhaseStart +
            (vestingPeriodDuration * currentVestingPeriod);

        return (block.timestamp >= currentPeriodPayDate);
    }
}
