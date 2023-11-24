// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/** Used for unit tests. Based off Chainlin's price feed contracts */
contract PriceFeed {

  private uint80 roundId;
  private int256 answer;
  private uint256 timestamp;
  private string description;

  constructor(uint80 _roundId, int256 _answer, uint256 _timestamp, string _description) {
    roundId = _roundId;
    answer = _answer;
    timestamp = _timestamp;
    description = _description;
  }

  function description()
    external
    view
    returns (string)
  {
    return description;
  }

  function latestRoundData()
    public
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    return (roundId, answer, timestamp, timestamp, roundId);
  }
}