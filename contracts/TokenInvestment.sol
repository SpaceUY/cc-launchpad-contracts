// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { UD60x18, ud, intoUint256 } from "@prb/math/UD60x18.sol";

/**
 * @title TokenDeposit
 * @author SpaceDev
 * @notice Handles recording token deposits (both erc20 compatible and native), their relay destinations (if applicable), and handles releasing funds
 */
abstract contract TokenInvestment {
  enum ReleaseDestination { NONE, SOURCE, RECIPIENT };

  struct Token {
    bool allowed;
    address priceFeedAddress;
  };

  error NotEnoughAllowance(address tokenAddress, uint256 amount);
  error TokenNotAllowed(address tokenAddress);


  event TokensDeposited(
    address indexed depositor,
    address tokenAddress,
    uint256 amount,
  );

  // 0x0 corresponds to the chain's native token
  mapping(address => Token) public allowedTokens;
  address[] depositors;
  mapping(address depositor => mapping(address token => uint256 amount)) depositedTokens;
  ReleaseDestination release;

  modifier onlyAllowedToken(address _tokenAddress) {
    if (!allowedTokens[_tokenAddress].allowed) {
      revert TokenNotAllowed(_tokenAddress);
    }
    _;
  }

  constructor(
    address[50] _allowedTokenAddrs, 
    address[50] _tokenPriceFeedAddrs
  ) {
    for (uint i = 0; i < 50; i++) {
      address tokenPriceFeed = _tokenPriceFeedAddrs[i];
      if (tokenPriceFeed == address(0)) {
        break;
      }
      allowedTokens[_allowedTokenAddrs[i]] = new Token(true, tokenPriceFeed);
    }
  }

  /**
   * Gets the USD value for the provided token. This assumes that chainlink
   * will always use 8 decimal places for USD.
   * @param _tokenAddress token address
   * @return price USD value per token in UD60x18, a fixed point representating using prb/math
   */
  function _getPriceForToken(address _tokenAddress)
    internal
    view
    return (UD60x18 price)
  {
    (uint80 roundId, int256 answer, uint startedAt, uint timestamp, uint80 answeredInRound) = AggregatorV3Interface(allowedTokens[_tokenAddress].priceFeedAddress).latestRoundData();
    return ud(answer * 1e10);
  }

  function _deposit(address _depositor, address _tokenAddress, uint256 _amount)
    internal
    returns (uint256 amountDeposited)
  {
    // native token is denoted with address zero 
    if (_tokenAddress == address(0)) {
      amountDeposited = msg.value;
    } else {
      amountDeposited = _amount;
      if (IERC20(_tokenAddress).allowance(_depositor, address(this)) < _amount) {
        revert NotEnoughAllowance(_tokenAddress, _amount);
      }
      IERC20(_tokenAddress).transfer(address(this), _amount);
    }
    depositors.push(_depositor);
    depositedTokens[depositor][_tokenAddress] += amountDeposited;
    emit TokensDeposited(_depositor, _tokenAddress, amountDeposited);
  }

  function _

  function _releaseToInvestors()
    internal
  {
    release = ReleaseDestination.SOURCE;
  }
}
