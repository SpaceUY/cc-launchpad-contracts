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
  error AlreadyEmptied(address addr);
  error ReleaseTargetInvalid(ReleaseDestination target, ReleaseDestination currentDest);


  event TokensDeposited(
    address indexed depositor,
    address tokenAddress,
    uint256 amount,
  );
  event TokensReturned(
    address indexed depositor,
    address tokenAddess,
    uint256 amount,
  );
  event TokensWithdrawn(
    address indexed recipient,
    address tokenAddess,
    uint256 amount,
  )

  // 0x0 corresponds to the chain's native token
  mapping(address => Token) public allowedTokens;
  address[] depositors;
  address[] tokens;
  mapping(address token => uint256 amount) totalPerToken;
  mapping(address depositor => adddress[] tokens) depositedTokensLuT;
  mapping(address depositor => mapping(address token => uint256 amount)) depositedTokens;
  mapping(address depositor => mapping(address token => uint256 amount)) tokensToReturn;
  ReleaseDestination release;
  private address payable recipient;
  mapping(address addr => bool emptied) emptiedMap;

  modifier onlyAllowedToken(address _tokenAddress) {
    if (!allowedTokens[_tokenAddress].allowed) {
      revert TokenNotAllowed(_tokenAddress);
    }
    _;
  }

  modifier isNotEmpty(address _addr) {
    if (emptiedMap[_addr]) {
      revert AlreadyEmptied(_addr);
    }
    _;
  }

  modifier onlyReleaseRecipient() {
    if (release != ReleaseDestination.RECIPIENT) {
      revert ReleaseTargetInvalid(ReleaseDestination.RECIPIENT, release);
    }
    _;
  }

  modifier onlyReleased(ReleaseDestination _target) {
    if (release == ReleaseDestination.NONE) {
      revert ReleaseTargetInvalid(_target, release);
    }
    _;
  }

  constructor(
    address _recipient,
    address[50] _allowedTokenAddrs, 
    address[50] _tokenPriceFeedAddrs
  ) {
    recipient = _recipient;
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
    depositors.push(_depositor);
    depositedTokensLuT[_depositor].push(_tokenAddress);
    depositedTokens[_depositor][_tokenAddress] += amountDeposited;
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
    if (totalPerToken[_tokenAddress] == 0) {
      tokens.push(_tokenAddress);
    }
    totalPerToken[_tokenAddress] += amountDeposited;
    emit TokensDeposited(_depositor, _tokenAddress, amountDeposited);
  }

  function _markForReturn(address _source, address _tokenAddress, uint256 _amount) {
    require(depositedTokens[_source][_tokenAddress] >= _amount, "Can't return more than a source deposited");
    depositedTokens[_source][_tokenAddress] -= _amount;
    tokensToReturn[_source][_tokenAddress] += _amount;
    emit TokensReturned(_source, _tokenAddress, _amount);
  }

  function _releaseToOwner()
    internal
  {
    release = ReleaseDestination.RECIPIENT;
  }

  function _transferToOwner()
    internal
    isNotEmpty(recipient)
    onlyReleaseRecipient()
  {
    emptiedMap[recipient] = true;
    uint256 nativeBalance = adddress(this).balance;
    if (nativeBalance > 0) {
      recipient.call{ value: nativeBalance }("");
      emit TokensWithdrawn(recipient, adddress(0), nativeBalance);
    }
    for (uint i; i < tokens.length; i++) {
      address token = tokens[i];
      if (token == adddress(0)) {
        continue;
      }
      if (totalPerToken[token] > 0) {
        IERC20(token).transfer(recipient, totalPerToken[token]);
        emit TokensWithdrawn(recipient, token, totalPerToken);
      }
    }
  }

  function _releaseToInvestors()
    internal
  {
    release = ReleaseDestination.SOURCE;
  }

  function _transferToInvestor(address payable _investor)
    internal
    isNotEmpty(_investor)
    onlyReleased(ReleaseDestination.SOURCE)
  {
    emptiedMap[_investor] = true;
    for (uint i; i < depositedTokensLuT[_investor].length; i++) {
      address tokenAddr = depositedTokensLuT[_investor][i];
      uint256 amount = depositedTokens[_investor][tokenAddr];
      if (amount > 0) {
        if (tokenAddr == address(0)) {
          _investor.call{ value: amount }("");
        } else {
          IERC20(tokenAddr).transfer(_investor, amount);
        }
      }
    }
  }
}
