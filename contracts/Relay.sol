// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {TokenInvestment} from "./TokenInvestment.sol";
import {LinkFundee} from "./LinkFunds.sol";

contract InvestmentRelayer is Ownable, TokenInvestment, LinkFundee {

  error DestinationChainNotAllowed(uint64 destinationChainSelector);

  event TokensTransferred(
    address indexed from, 
    bytes32 messageId,
    address token,
    uint256 tokenAmount,
    uint256 usdValue,
    uint256 linkFees
  );

  uint64 idoChain;
  address idoAddress;
  address idoOwner;

  IRouterClient router;

  modifier onlyAllowedChain(uint64 _destinationChainSelector) {
    if (_destinationChainSelector != idoChain) {
      revert DestinationChainNotWhitelisted(_destinationChainSelector);
    }
    _;
  }

  constructor (
    address _router,
    address _linkAddress, 
    address _linkFunder, 
    uint64 _idoChain, 
    address _idoAddress,
    address _idoOwner,
    address[50] _allowedTokenAddrs, 
    address[50] _tokenPriceFeedAddrs
  ) 
    Ownable(msg.sender)
    LinkFundee(_linkAddress, _linkFunder)
    TokenInvestment(_allowedTokenAddrs, _tokenPriceFeedAddrs)
  {
    router = IRouterClient(_router);
    allowedChains[_idoChain] = true;
    idoChain = _idoChain;
    idoAddress = _idoAddress;
  }

  function allowToken(address _tokenAddress, address _priceFeedAddress) external onlyOwner {
    allowedTokens[_tokenAddress] = Token(true, _priceFeedAddress);
  }

  function denyToken(address _tokenAddress) external onlyOwner {
    allowedTokens[_tokenAddress].allowed = false;
  }

  function invest(address _tokenAddress, uint256 _amount)
    external
    payable
    onlyAllowedChain(_destinationChainSelector)
    onlyAllowedToken(_tokenAddress)
    returns (bytes32 messageId)
  {
    uint256 amountDeposited = _deposit();
    UD60x18 price = _getPriceForToken(_tokenAddress);
    uint8 tokenDecimals = _tokenAddress == address(0) ? 18 : IERC20(_tokenAddress).decimals();
    UD60x18 tokenAmount;
    // If decimal place is already 18, no need to do conversion
    if (tokenDecimals == 18) {
      tokenAmount = ud(amountDeposited);
    } else {
      tokenAmount = ud(amountDeposited * (10**(18 - tokenDecimals)));
    }
    UD60x18 investedValue = tokenAmount.mul(price);

    Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](0);
    Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
      receiver: abi.encode(idoAddress),
      data: abi.encodeWithSignature("_relayInvest(uint256, address, int256, uint256)", uint256(0), _tokenAddress, _amount, intoUint256(investedValue)),
      tokenAmounts: tokenAmounts,
      extraArgs: Client._argsToBytes(
        Client.EVMExtraArgsV1({gasLimit: 200_000, strict: false})
      ),
      feeToken: address(linkToken)
    });

    uint256 fees = router.getFee(idoChain, message);
    _requestAndApprove(address(router), fees);
    messageId = router.ccipSend(idoChain, message);

    emit TokensTransferred(
      msg.sender,
      messageId,
      _tokenAddress,
      _amount,
      intoUint256(investedValue),
      fees
    );   
  }
}