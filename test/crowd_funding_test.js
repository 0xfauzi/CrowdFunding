let TestCrowdFundingWithDeadline = artifacts.require('./TestCrowdFundingWithDeadline')

contract('TestCrowdFundingWithDeadline', function (accounts) {

    let contract;
    let contractCreator = accounts[0];
    let beneficiary = accounts[1];

    const ONE_ETH = 1;
    const FIVE_ETH = 5;
    const ERROR_MSG = 'Returned error: VM Exception while processing transaction: revert No contributions after the deadline -- Reason given: No contributions after the deadline.';

    const ONGOING_STATE = '0';
    const FAILED_STATE = '1';
    const SUCCEEDED_STATE = '2';
    const PAID_OUT_STATE = '3';

    beforeEach(async function () {
        contract = await TestCrowdFundingWithDeadline.new(
            'funding',
            FIVE_ETH,
            10,
            beneficiary,
            {
                from: contractCreator,
                gas: 2000000
            }
        )
    });

    it('contract is initialized', async function () {
        let campaignName = await contract.name.call();
        expect(campaignName).to.equal('funding');

        let targetAmount = await contract.targetAmount.call();
        expect(targetAmount).to.eql(web3.utils.toBN(FIVE_ETH));

        let fundingDeadline = await contract.fundingDeadline.call();
        expect(fundingDeadline).to.eql(web3.utils.toBN(600));

        let actualBeneficiary = await contract.beneficiary.call();
        expect(actualBeneficiary).to.equal(beneficiary);

        let state = await contract.state.call();
        expect(state.valueOf()).to.eql(web3.utils.toBN(ONGOING_STATE));
    });

    it('funds are contributed', async function () {
        await contract.contribute({
            value: FIVE_ETH,
            from: contractCreator
        });

        let contributed = await contract.amounts.call(contractCreator);
        expect(contributed).to.eql(web3.utils.toBN(FIVE_ETH));

        let totalCollected = await contract.totalCollected.call();
        expect(totalCollected).to.eql(web3.utils.toBN(FIVE_ETH));
    });

    it('cannot contribute after deadline', async function () {
        try {
            await contract.setCurrentTime(601);
            await contract.contribute({
                value: FIVE_ETH,
                from: contractCreator
            });
            expect.fail();
        } catch (error) {
            expect(error.message).to.equal(ERROR_MSG);
        }
    });

    it('crowdfunding succeeeded', async function () {
        await contract.contribute({ value: FIVE_ETH, from: contractCreator });
    
        await contract.setCurrentTime(601);
        await contract.finishCrowdFunding();
        let state = await contract.state.call();

        expect(state.valueOf().toString()).to.equal(SUCCEEDED_STATE);
    });

    it('crowdfunding failed', async function() {
        await contract.setCurrentTime(601);
        await contract.finishCrowdFunding();
        let state = await contract.state.call();

        expect(state.valueOf().toString()).to.eql(FAILED_STATE);
    });
    
    it('collected money paid out', async function() {
        await contract.contribute({value: FIVE_ETH, from: contractCreator});
        await contract.setCurrentTime(601);
        await contract.finishCrowdFunding();

        let initAmount = await web3.eth.getBalance(beneficiary);
        await contract.collect({from: contractCreator});

        let newBalance = await web3.eth.getBalance(beneficiary);
        expect(newBalance - initAmount).to.equal(0);

        let fundingState = await contract.state.call();
        expect(fundingState.valueOf().toString()).to.equal(PAID_OUT_STATE);
    });

    it('withdraw funds from the contract', async function() {
        await contract.contribute({value: ONE_ETH, from: contractCreator});
        await contract.setCurrentTime(601);
        await contract.finishCrowdFunding();

        await contract.withdraw({from: contractCreator});
        let amount = await contract.amounts.call(contractCreator);
        expect(amount.toNumber()).to.equal(0);
    });

    it('event is emitted', async function() {
        let watcher = contract.CampaignFinished();
        await contract.setCurrentTime(601);
        await contract.finishCrowdFunding();

        // web3.setProvider(new Web3.providers.WebsocketProvider('ws://localhost:8546'));

        let events = await watcher.get();
        let event = events[0];
        expect(event.args.totalCollected.toNumber()).to.equal(0);
        expect(event.args.succeeded).to.equal(false);
    });
});