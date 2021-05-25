// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract CrowdFundingWithDeadline {

    enum State { Ongoing, Failed, Succeeded, PaidOut }

    event CampaignFinished(
        address addr,
        uint totalCollected,
        bool succeeded
    );

    mapping(address => uint) public amounts;
    bool public collected;
    uint public totalCollected;
    string public name;
    uint public targetAmount;
    uint public fundingDeadline;
    address payable public beneficiary;
    State public state;

    modifier inState(State expectedState) {
        require(state == expectedState, "Invalid state");
        _;
    }

    constructor (string memory campaignName, uint targetAmountEth, uint durationInMin, address payable beneficiaryAddress) public {
        name = campaignName;
        targetAmount = targetAmountEth;
        fundingDeadline = currentTime() + durationInMin * 1 minutes;
        beneficiary = beneficiaryAddress;
        state = State.Ongoing;
    }

    function contribute() public payable inState(State.Ongoing) {
        
        require(beforeDeadline(), "No contributions after the deadline");

        amounts[msg.sender] += msg.value;
        totalCollected += msg.value;

        if (totalCollected >= targetAmount) {
            collected = true;
        }
    }

    function finishCrowdFunding() public inState(State.Ongoing) {
        require(!beforeDeadline(), "Cannot finish campaign before a deadline");

        if (!collected) {
            state = State.Failed;
        } else {
            state = State.Succeeded;
        }

        emit CampaignFinished(address(this), totalCollected, collected);
    }

    function collect() public inState(State.Succeeded) {
        if (beneficiary.send(totalCollected)) {
            state = State.PaidOut;
        } else {
            state = State.Failed;
        }
    }

    function withdraw() public inState(State.Failed) {
        require(amounts[msg.sender] > 0, "Nothing was contributed");
        uint contributed = amounts[msg.sender];
        amounts[msg.sender] = 0;

        if (!payable(msg.sender).send(contributed)) {
            amounts[msg.sender] = contributed;
        }
    }

    function beforeDeadline() public view returns(bool) {
        return currentTime() < fundingDeadline;
    }

    function currentTime() virtual internal view returns(uint) {
        return block.timestamp;
    }

}