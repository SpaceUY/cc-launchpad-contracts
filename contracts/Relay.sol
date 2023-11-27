// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import { UD60x18, ud, intoUint256 } from "@prb/math/UD60x18.sol";
import {TokenDeposit} from "./TokenDeposit.sol";
import {LinkFundee} from "./LinkFunds.sol";

contract InvestmentRelayer is Ownable, TokenDeposit, LinkFundee {

  struct Token {
    bool allowed;
    address priceFeedAddress;
  }

  error DestinationChainNotAllowed(uint64 destinationChainSelector);
  error TokenNotAllowed(address tokenAddress)

  event TokensTransferred(
    bytes32 indexed messageId,
    uint64 indexed destinationChainSelector,
    address receiver,
    address token,
    uint256 tokenAmount,
    uint256 usdValue,
    uint256 fees
  );

  mapping(uint64 => bool) public allowedChains;

  // 0x0 corresponds to the chain's native token
  mapping(address => Token) public allowedTokens;

  IRouterClient router;

  modifier onlyAllowedChain(uint64 _destinationChainSelector) {
    if (!allowedChains[_destinationChainSelector]) {
      revert DestinationChainNotWhitelisted(_destinationChainSelector);
    }
    _;
  }

  modifier onlyAllowedToken(address _tokenAddress) {
    if (!allowedTokens[_tokenAddress].allowed) {
      revert TokenNotAllowed(_tokenAddress);
    }
    _;
  }

  constructor (
    address _router,
    address _linkAddress, 
    address _linkFunder, 
    uint64[20] _allowedChains, 
    address[50] _allowedTokenAddrs, 
    address[50] _tokenPriceFeedAddrs
  ) 
    Ownable(msg.sender)
    LinkFundee(_linkAddress, _linkFunder)
  {
    router = IRouterClient(_router);
  }

  function allowChain(uint64 _destinationChainSelector) external onlyOwner {
    allowedChains[_destinationChainSelector] = true;
  }

  function denyChain(uint64 _destinationChainSelector) external onlyOwner {
    allowedChains[_destinationChainSelector] = false;
  }

  function allowToken(address _tokenAddress, address _priceFeedAddress) external onlyOwner {
    allowedTokens[_tokenAddress] = Token(true, _priceFeedAddress);
  }

  function denyToken(address _tokenAddress, address _priceFeedAddress) external onlyOwner {
    allowedTokens[_tokenAddress].allowed = false;
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

  function invest(uint64 _destinationChainSelector, address _idoAddress, address _tokenAddress, uint256 _amount)
    external
    payable
    onlyAllowedChain(_destinationChainSelector)
    onlyAllowedToken(_tokenAddress)
    returns (bytes32 messageId)
  {
    UD60x18 price = _getPriceForToken(_tokenAddress);
    uint8 tokenDecimals = _tokenAddress == address(0) ? 18 : IERC20(_tokenAddress).decimals();
    UD60x18 tokenAmount;
    // If decimal place is already 18, no need to do conversion
    if (tokenDecimals == 18) {
      tokenAmount = ud(tokenDecimals);
    } else {
      tokenAmount = ud(tokenDecimals * (10**(18 - tokenDecimals)));
    }
    UD60x18 investedValue = tokenAmount.mul(price);

    Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](0);
    Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
      receiver: abi.encode(_idoAddress),
      data: abi.encodeWithSignature("_relayInvest(uint256, address, int256, uint256)", uint256(0), _tokenAddress, _amount, intoUint256(investedValue)),
      tokenAmounts: tokenAmounts,
      extraArgs: Client._argsToBytes(
        Client.EVMExtraArgsV1({gasLimit: 200_000, strict: false})
      ),
      feeToken: address(linkToken)
    });

    uint256 fees = router.getFee(_destinationChainSelector, message);
    _requestAndApprove(address(router), fees);
    messageId = router.ccipSend(_destinationChainSelector, message);

    emit TokensTransferred(
      messageId,
      _destinationChainSelector,
      _idoAddress,
      _tokenAddress,
      _amount,
      intoUint256(investedValue),
      fees
    );   
  }
}