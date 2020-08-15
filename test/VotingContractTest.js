require('dotenv').config()

const { use, expect } = require('chai')
const BigNumber = require('bignumber.js');

const { MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

const STAKING = require('../build/Staking')
const TIMELOCK = require('../build/Timelock')
const VOTING = require('../build/Voting')

use(solidity);

const {
  encodeParameters,
  keccak256,
  etherUnsigned,
} = require('./utils/ETH');

describe('Voting Contract', () => {
  let votingContract, newVotingContract, timelockContract, stakingContract
  
  const [timelock, staking, guardian, account, anotherAccount, newGuardian, voter, anotherVoter] = new MockProvider({ total_accounts: 8 }).getWallets();
  const [newTimelock, newStaking] = new MockProvider({ total_accounts: 2 }).getWallets();

  let quorumVotes, proposalThreshold, proposalMaxOperations
  let votingDelay, votingPeriod
  
  let trivialProposal, targets, values, signatures, callDatas, proposalBlock, proposalId, anotherProposalId
  let eta

  beforeEach(async() => {
    timelockContract = await deployContract(timelock, TIMELOCK, [])
    stakingContract = await deployContract(staking, STAKING, [])

    votingContract = await deployContract(guardian, VOTING, [], { gasLimit: 4712388 })  

    quorumVotes = 100
    proposalThreshold = 0
    proposalMaxOperations = 100
    votingDelay = 12 * 60 * 60    // 12 hours
    votingPeriod = 3 * 24 * 60 * 60 // 3 days
    eta = 100

    await votingContract.initialize(timelock.address, staking.address, guardian.address)

  });

  describe('Voting Contract Set authorizeGuardianshipTransfer', async() => {
    it ('Set Guardian', async() => {
      await votingContract.authorizeGuardianshipTransfer(newGuardian.address)

      expect (await votingContract._authorizedNewGuardian()).to.be.equal(newGuardian.address)
    })

    it ('Assume TimeLock Guardian', async() => {
      await expect(votingContract.assumeTimelockGuardianship()).to.be.reverted
    })

    it ('Queue Authorize Guardian Transfer', async() => {
      await expect(votingContract.queueAuthorizeGuardianshipTransfer(account.address, eta)).to.be.reverted
    })

    it ('Execute Authorize Guardian Transfer', async() => {
      await expect(votingContract.executeAuthorizeGuardianshipTransfer(account.address, eta)).to.be.reverted
    })
  })

  describe('Voting Contract Set QuorumVotes', async() => {
    it ('Check Guardian', async() => {
      expect (await votingContract._guardian()).to.be.equal(guardian.address)
    })

    it ('Check Set QuorumVotes', async() => {
      await votingContract.setQuorumVotes(quorumVotes)

      expect (await votingContract._quorumVotes()).to.be.equal(quorumVotes)
    })
  })

  describe('Voting Contract Set ProposalThreshold', async() => {
    it ('Check Guardian', async() => {
      expect (await votingContract._guardian()).to.be.equal(guardian.address)
    })

    it ('Check Set ProposalThreshold', async() => {
      await votingContract.setProposalThreshold(proposalThreshold)

      expect (await votingContract._proposalThreshold()).to.be.equal(proposalThreshold)
    })
  })

  describe('Voting Contract Set ProposalMaxOperations', async() => {
    it ('Check Guardian', async() => {
      expect (await votingContract._guardian()).to.be.equal(guardian.address)
    })

    it ('Check Set ProposalMaxOperations', async() => {
      await votingContract.setProposalMaxOperations(proposalMaxOperations)

      expect (await votingContract._proposalMaxOperations()).to.be.equal(proposalMaxOperations)
    })
  })

  describe('Voting Contract Set ProposalMaxOperations', async() => {
    it ('Check Guardian', async() => {
      expect (await votingContract._guardian()).to.be.equal(guardian.address)
    })

    it ('Check Set ProposalMaxOperations', async() => {
      await votingContract.setProposalMaxOperations(proposalMaxOperations)

      expect (await votingContract._proposalMaxOperations()).to.be.equal(proposalMaxOperations)
    })
  })

  describe('Voting Contract Set VotingDelay', async() => {
    it ('Check Guardian', async() => {
      expect (await votingContract._guardian()).to.be.equal(guardian.address)
    })

    it ('Check Set Voting Delay', async() => {
      await votingContract.setVotingDelay(votingDelay)

      expect (await votingContract._votingDelay()).to.be.equal(votingDelay)
    })
  })

  describe('Voting Contract Set VotingPeriod', async() => {
    it ('Check Guardian', async() => {
      expect (await votingContract._guardian()).to.be.equal(guardian.address)
    })

    it ('Check Set Voting Period', async() => {
      await votingContract.setVotingPeriod(votingPeriod)

      expect (await votingContract._votingPeriod()).to.be.equal(votingPeriod)
    })
  })

  describe('Voting Contract Proposal', async() => {
    beforeEach(async() => {
      targets = [guardian.address];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [account.address])];

      await votingContract.setProposalMaxOperations(proposalMaxOperations)

      await votingContract.propose(targets, values, signatures, callDatas, "Initial")
    
      proposalId = await votingContract._latestProposalIds(guardian.address)

      trivialProposal = await votingContract._proposals(proposalId)
    })

    it ('Initial Check Parameters', async() => {
      await expect(trivialProposal.id).to.be.equal(proposalId)

      await expect(trivialProposal.proposer).to.be.equal(guardian.address);

      await expect(trivialProposal.canceled).to.be.equal(false);
      await expect(trivialProposal.executed).to.be.equal(false);
    })

    it ('Check Get Actions', async() => {
      let dynamicFields = await votingContract.getOperations(trivialProposal.id)

      if (dynamicFields.targets.length === targets.length) {
        for (let i = 0; i < targets.length; i ++) {
          await expect(dynamicFields.targets[i]).to.be.equal(targets[i]);
        }
      }      

      if (dynamicFields.values.length === values.length) {
        for (let i = 0; i < values.length; i ++) {
          await expect(dynamicFields.values[i]).to.be.equal(values[i]);
        }
      }      


      if (dynamicFields.signatures.length === signatures.length) {
        for (let i = 0; i < signatures.length; i ++) {
          await expect(dynamicFields.signatures[i]).to.be.equal(signatures[i]);
        }
      }      

      if (dynamicFields.calldatas.length === callDatas.length) {
        for (let i = 0; i < callDatas.length; i ++) {
          await expect(dynamicFields.calldatas[i]).to.be.equal(callDatas[i]);
        }
      }      
    })

    it ('Create Proposal', async() => {
      targets = [newGuardian.address]

      await votingContract.propose(targets, values, signatures, callDatas, "Test")
    })
  })

  describe('Voting Contract to Queue', async() => {
    beforeEach(async() => {
      targets = [account.address];
      values = ["100"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [account.address])];
      
      await votingContract.setProposalMaxOperations(proposalMaxOperations)

      await votingContract.propose(targets, values, signatures, callDatas, "Test for one proposal to Queue")
    })

    it ('New Proposal to Queue', async() => {
      proposalId = await votingContract._latestProposalIds(account.address)

      await expect(votingContract.queue(proposalId)).to.be.reverted
    })  

    it ('Two Proposals to Queue', async() => {         
      targets = [anotherAccount.address];
      values = ["200"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [anotherAccount.address])];

      await votingContract.propose(targets, values, signatures, callDatas, "Test for another proposal to Queue")

      proposalId = await votingContract._latestProposalIds(account.address)
      anotherProposalId = await votingContract._latestProposalIds(anotherAccount.address)

      await expect(proposalId).to.be.equal(anotherProposalId)
    })

    it ('The proposal to execute', async() => {
      proposalId = await votingContract._latestProposalIds(account.address)

      await expect(votingContract.execute(proposalId)).to.be.reverted
    })

    it ('The proposal to cancel', async() => {
      proposalId = await votingContract._latestProposalIds(account.address)

      await expect(votingContract.execute(proposalId)).to.be.reverted

      await expect(votingContract.cancel(proposalId)).to.be.reverted
    })

    it ('The proposal of state', async() => {
      await expect(votingContract.execute(proposalId)).to.be.reverted

      await expect(votingContract.state(proposalId)).to.be.reverted
    })
  })

  describe('Cast Vote', async() => {
    beforeEach(async() => {
      targets = [account.address];
      values = ["150"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [account.address])];
      
      await votingContract.setProposalMaxOperations(proposalMaxOperations)

      await votingContract.propose(targets, values, signatures, callDatas, "Test for one proposal to Queue")
      proposalId = await votingContract._latestProposalIds(account.address)
    })

    it ('To check get receipt with voter', async() => {     
      await expect(votingContract.getReceipt(proposalId, voter.address)).to.be.reverted
    })

    it ('To do CastVote with one voter', async() => {
      await expect(votingContract.getReceipt(proposalId, voter.address)).to.be.reverted

      await expect(votingContract.castVote(proposalId, true)).to.be.reverted
    })

    it ('To do CastVote one voter to different proposals', async() => {
      // Create New another proposal
      targets = [anotherAccount.address];
      values = ["150"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [anotherAccount.address])];

      const result = await votingContract.propose(targets, values, signatures, callDatas, "Test for another proposal to Queue")
      anotherProposalId = await votingContract._latestProposalIds(anotherAccount.address)

      // Cast Vote to first proposal
      await expect(votingContract.getReceipt(proposalId, voter.address)).to.be.reverted

      await expect(votingContract.castVote(proposalId, true)).to.be.reverted

      // Cast Vote to second proposal with same voter
      await expect(votingContract.getReceipt(anotherProposalId, voter.address)).to.be.reverted

      await expect(votingContract.castVote(anotherProposalId, true)).to.be.reverted
    })

    it ('To do CastVote with different voters to one proposal', async() => {
      // Cast first Voter to the Proposal
      await expect(votingContract.getReceipt(proposalId, voter.address)).to.be.reverted

      await expect(votingContract.castVote(proposalId, true)).to.be.reverted

      // Cast second Voter to the Proposal
      await expect(votingContract.getReceipt(proposalId, anotherVoter.address)).to.be.reverted

      await expect(votingContract.castVote(proposalId, true)).to.be.reverted
    })
  })
});
