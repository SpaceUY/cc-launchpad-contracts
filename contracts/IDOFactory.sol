// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IDO.sol"; // Adjust the path as needed

contract IDOFactory {
    // Event to emit when a new IDO is created
    event IDOCreated(address indexed idoAddress);

    // Array to keep track of all created IDOs
    address[] public deployedIDOs;

    // Function to create a new IDO
    function createIDO(
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
    ) public {
        IDO newIDO = new IDO(
            _tokenAddress,
            _tokenPrice,
            _minContribution,
            _maxContribution,
            _softCap,
            _hardCap,
            _investingPhaseInDays,
            _vestingCliffInDays,
            _vestingTotalPeriods,
            _vestingPeriodInDays,
            _vestingPeriodPercentage
        );
        deployedIDOs.push(address(newIDO));
        emit IDOCreated(address(newIDO));
    }

    function getDeployedIDOs() public view returns (address[] memory) {
        return deployedIDOs;
    }
}
