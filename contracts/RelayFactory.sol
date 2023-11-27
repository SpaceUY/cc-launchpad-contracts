// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Relay} from "./Relay.sol"; // Adjust the path as needed
import {LinkFunder} from "./LinkFunds.sol";

contract RelayFactory is LinkFunder {
  // Event to emit when a new Relay is created
  event RelayCreated(address indexed relayAddress);

  // Array to keep track of all created Relays
  address[] public deployedRelays;

  address routerAddr;

  constructor(address _router, address _linkAddress) LinkFunder(_linkAddress) {
    routerAddr = _router;
  }

  // Function to create a new Relay
  function createRelay(
    uint64[20] _allowedChains, 
    address[50] _allowedTokenAddrs, 
    address[50] _tokenPriceFeedAddrs
  ) 
    public
  {
    IDO newRelay = new Relay(
      routerAddr,
      address(linkToken),
      address(this),
      _allowedChains, 
      _allowedTokenAddrs, 
      _tokenPriceFeedAddrs
    );
    deployedRelays.push(address(newRelay));
    _addFundee(address(newRelay));
    emit RelayCreated(address(newRelay));
  }

  function getDeployedRelays() public view returns (address[] memory) {
    return deployedRelays;
  }
}
