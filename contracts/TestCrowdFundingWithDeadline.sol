// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./CrowdFunding.sol";

contract TestCrowdFundingWithDeadline is CrowdFundingWithDeadline {
    
    uint time;

    constructor(
        string memory contractName,
        uint targetAmountEth,
        uint durationInMin,
        address payable beneficiaryAddress
    ) CrowdFundingWithDeadline(contractName, targetAmountEth, durationInMin, beneficiaryAddress) public {

    }

    function currentTime() override internal view returns (uint) {
        return time;
    }

    function setCurrentTime(uint newTime) public {
        time = newTime;
    }
}