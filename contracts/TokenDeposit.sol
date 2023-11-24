// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TokenDeposit
 * @author SpaceDev
 * @notice Handles recording token deposits (both erc20 compatible and native), their relay destinations (if applicable), and handles releasing funds
 */
abstract contract TokenDeposit {
  enum ReleaseDestination { NONE, SOURCE, RECIPIENT };

  error NotEnoughAllowance(address tokenAddress, uint256 amount);

  function _depositTokens(address _depositor, address _tokenAddress, uint256 _amount)
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
  }
}

contract ProxyTokenDeposit is TokenDeposit {

  struct DepositTarget {
    address[] depositors;
    mapping(address depositor => mapping(address token => uint256 amount)) depositedTokens;
    ReleaseDestination release;
  }

  mapping(uint64 destinationChainSelector => mapping(address targetContract => IDO))

  function _deposit(address _depositor, uint64 _destinationChainSelector, address _tokenAddress, uint256 _amount)
    internal
  {
    uint256 amountDeposited = _depositTokens(_depositor, _tokenAddress, _amount);
    


  }
}

contract SelfTokenDeposit is TokenDeposit {
  event TokensDeposited(
    address indexed depositor,
    address tokenAddress,
    uint256 amount,
  );

  address[] depositors;
  mapping(address depositor => mapping(address token => uint256 amount)) depositedTokens;
  ReleaseDestination release;

  function _deposit(address _depositor, address _tokenAddress, uint256 _amount)
    internal
  {
    uint256 amountDeposited = _depositTokens(_depositor, _tokenAddress, _amount);
    depositors.push(_depositor);
    depositedTokens[depositor][_tokenAddress] += amountDeposited;
    emit TokensDeposited(_depositor, _tokenAddress, amountDeposited);
  }
}
