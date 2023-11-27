import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";


abstract contract LinkFunder {

  error AddressNotFundee(address addr);
  error NotEnoughBalance(uint256 currentBalance, uint256 amountRequested);

  event LinkFunded(
    address indexed fundee,
    uint256 amount
  );

  LinkTokenInterface linkToken;

  struct FundeeCharges {
    bool isFundee;
    uint256 linkConsumed;
  }

  mapping(address fundeeAddr => FundeeCharges) public fundees;

  modifier onlyFundee(address _fundeeAddress) {
    if (!fundees[_fundeeAddress].isFundee) {
      revert AddressNotFundee(_fundeeAddress);
    }
    _;
  }

  constructor(address _linkAddress) {
    linkToken = LinkTokenInterface(_linkAddress);
  }

  function _addFundee(address _fundee)
    internal
  {
    fundees[_fundee].isFundee = true;
  }

  function _transferLink(address _fundee, uint256 _amount) 
    internal
  {
    uint256 balance = linkToken.balanceOf(address(this));
    if (balance < _amount) {
      revert NotEnoughBalance(balance, _amount);
    }
    linkToken.transfer(_fundee, _amount);
    fundees[_fundee].linkConsumed += _amount;
    emit LinkFunded(_fundee, _amount);
  }

  function requestLink(uint256 _amount)
    external
    onlyFundee(msg.sender)
  {
    _transferLink(msg.sender, _amount);
  }
}

abstract contract LinkFundee {
  LinkTokenInterface linkToken;
  LinkFunder funder;

  constructor(address _linkAddress, address _funderAddress) {
    linkToken = LinkTokenInterface(_linkAddress);
    funder = LinkFunder(_funderAddress);
  }

  function _requestAndApprove(address _to, uint256 _amount)
    internal
  {
    funder.requestLink(_amount);
    linkToken.approve(_to, _amount);
  }
}