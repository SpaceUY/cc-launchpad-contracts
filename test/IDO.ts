import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  idoParamsArray,
  idoParamsObj,
  spaceERC20ParamsArray,
  IDOParams,
  HIGHER_MAX_CONTRIBUTION,
  MINT_TOKENS,
  IDOParamsConstructor,
} from "../params";
import { IDO, SpaceERC20 } from "../typechain-types";
import { daysToSeconds, getCost } from "../utils/functions";

interface Fixture {
  spaceERC20: SpaceERC20;
  spaceERC20Address: string;
  ido: IDO;
  idoAddress: string;
  idoAsAcc1: IDO;
  idoAsAcc2: IDO;
  idoAsAcc3: IDO;
  owner: HardhatEthersSigner;
  ownerAddress: string;
  initialOwnerBalance: bigint;
  acc1: HardhatEthersSigner;
  acc1Address: string;
  initialAcc1Balance: bigint;
  acc2: HardhatEthersSigner;
  acc2Address: string;
  acc3: HardhatEthersSigner;
  acc3Address: string;
}

enum IDOState {
  Preparing,
  Active,
  Refunded,
  Completed,
}

interface FixtureFactoryParams {
  idoParams?: IDOParamsConstructor;
  withTokens?: number;
  initialState?: IDOState;
}

describe("IDO", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  // Fixture factory function
  function createFixtureWithParams(fixtureFactoryParams: FixtureFactoryParams) {
    const { idoParams, withTokens, initialState } = fixtureFactoryParams;

    // Return a new function that will be used as the actual fixture
    return async function deployFixture(): Promise<Fixture> {
      const [owner, acc1, acc2, acc3] = await hre.ethers.getSigners();
      const ownerAddress = await owner.getAddress();
      const acc1Address = await acc1.getAddress();
      const acc2Address = await acc2.getAddress();
      const acc3Address = await acc3.getAddress();

      const spaceERC20 = await hre.ethers.deployContract("SpaceERC20", spaceERC20ParamsArray, {});
      await spaceERC20.waitForDeployment();
      const spaceERC20Address = await spaceERC20.getAddress();

      // Apply the IDO params passed to the factory function
      const finalIdoParams = [...idoParamsArray];
      finalIdoParams[0] = spaceERC20Address;
      // @TBD Currently we are only overriding the maxContribution
      // If more params are needed for testing purposes, we should add them to the factory function
      if (idoParams?._maxContribution) {
        finalIdoParams[3] = idoParams._maxContribution;
      }

      const ido = await hre.ethers.deployContract("IDO", finalIdoParams, {});
      await ido.waitForDeployment();
      const idoAddress = await ido.getAddress();

      const idoAsAcc1 = ido.connect(acc1);
      const idoAsAcc2 = ido.connect(acc2);
      const idoAsAcc3 = ido.connect(acc3);

      // mint spaceERC20 tokens to ido contract
      if (withTokens) {
        await spaceERC20.mint(idoAddress, withTokens);
      }

      // Apply the initial state passed to the factory function
      if (initialState === IDOState.Active) {
        await ido.activateIdo();
      } else if (initialState === IDOState.Refunded) {
        // @TBD
        throw new Error("Not implemented in fixture factory");
      } else if (initialState === IDOState.Completed) {
        // @TBD
        throw new Error("Not implemented in fixture factory");
      }

      const initialOwnerBalance = await owner.provider.getBalance(ownerAddress);
      const initialAcc1Balance = await owner.provider.getBalance(acc1Address);

      return {
        spaceERC20,
        spaceERC20Address,
        ido,
        idoAddress,
        idoAsAcc1,
        idoAsAcc2,
        idoAsAcc3,
        owner,
        ownerAddress,
        initialOwnerBalance,
        acc1,
        initialAcc1Balance,
        acc1Address,
        acc2,
        acc2Address,
        acc3,
        acc3Address,
      };
    };
  }

  const defaultFixture = createFixtureWithParams({ withTokens: MINT_TOKENS });

  const defaultFixtureWithoutTokens = createFixtureWithParams({ withTokens: 0 });

  const activatedFixture = createFixtureWithParams({
    withTokens: MINT_TOKENS,
    initialState: IDOState.Active,
  });

  const higherMaxContributionFixture = createFixtureWithParams({
    idoParams: { _maxContribution: HIGHER_MAX_CONTRIBUTION },
    withTokens: MINT_TOKENS,
    initialState: IDOState.Active,
  });

  /*
   * Initialization fo the IDO Test Suite
   * "Oh lord of the ledger, shield our contract from bugs that lurk in the shadow of hasty keystrokes,
   * shielded by caffeine and optimism. As we commit our code, fingers crossed, touch wood, and let the
   * ghost of Satoshi guide our assertions. Amen to the holy console.log, and may our wei never wander astray."
   */

  describe("State: Preparation", function () {
    it("Should have correct variables setted from constructor parameters", async function () {
      const { ido } = await loadFixture(defaultFixture);

      expect(await ido.state()).to.equal(0);
      expect(await ido.tokenPrice()).to.equal(idoParamsObj._tokenPrice);
      expect(await ido.minContribution()).to.equal(idoParamsObj._minContribution);
      expect(await ido.maxContribution()).to.equal(idoParamsObj._maxContribution);
      expect(await ido.softCap()).to.equal(idoParamsObj._softCap);
      expect(await ido.hardCap()).to.equal(idoParamsObj._hardCap);
      expect(await ido.investingPhaseDuration()).to.equal(
        daysToSeconds(idoParamsObj._investingPhaseInDays)
      );
      expect(await ido.vestingCliffDuration()).to.equal(
        daysToSeconds(idoParamsObj._vestingCliffInDays)
      );
      expect(await ido.vestingPeriodDuration()).to.equal(
        daysToSeconds(idoParamsObj._vestingPeriodInDays)
      );
      expect(await ido.vestingPeriodPercentage()).to.equal(idoParamsObj._vestingPeriodPercentage);
    });

    it(`Should be pausable and unpausable`, async function () {
      const { ido } = await loadFixture(defaultFixture);

      expect(await ido.paused()).to.equal(false);
      await ido.pause();
      expect(await ido.paused()).to.equal(true);
      await ido.unpause();
      expect(await ido.paused()).to.equal(false);
    });

    it(`Should not be pausable by another account`, async function () {
      const { ido, idoAsAcc1 } = await loadFixture(defaultFixture);

      await expect(idoAsAcc1.pause()).to.be.reverted;
      expect(await ido.paused()).to.equal(false);
    });

    it(`Should not be able to invest during the Preparing Phase`, async function () {
      const { ido } = await loadFixture(defaultFixture);

      expect(await ido.state()).to.equal(0);
      await expect(ido.invest()).to.be.revertedWith("IDO is not in Active State");
    });

    it(`Should have received the token funding from the project owner`, async function () {
      const { ido, spaceERC20, idoAddress } = await loadFixture(defaultFixture);

      expect(await spaceERC20.balanceOf(idoAddress)).to.equal(500000);
    });

    it(`Should be Activable if has received token funding`, async function () {
      const { ido } = await loadFixture(defaultFixture);

      expect(await ido.state()).to.equal(0);
      await ido.activateIdo();
      expect(await ido.state()).to.equal(1);
    });

    it(`Should not be Activable if has not received token funding`, async function () {
      const { ido } = await loadFixture(defaultFixtureWithoutTokens);

      expect(await ido.state()).to.equal(0);
      await expect(ido.activateIdo()).to.be.revertedWith("IDO contract has no tokens to sell");
    });
  });

  describe("State: Active", function () {
    describe("Investment", function () {
      describe("Personal Investing limits", function () {
        let minContribution = idoParamsObj._minContribution;
        let maxContribution = idoParamsObj._maxContribution;

        it(`Should not be able to invest less than the min contribution`, async function () {
          const fixture = await loadFixture(activatedFixture);

          await expect(fixture.idoAsAcc1.invest({ value: minContribution - 1n })).to.be.reverted;
        });

        it(`Should not be able to invest more than the max contribution`, async function () {
          const fixture = await loadFixture(activatedFixture);

          await expect(fixture.idoAsAcc1.invest({ value: maxContribution + 1n })).to.be.reverted;
        });

        it("Should be able to invest more than the min contribution", async function () {
          let fixture = await loadFixture(activatedFixture);

          const acc1Address = fixture.acc1Address;

          await fixture.idoAsAcc1.invest({ value: minContribution });

          let totalContribution = (await fixture.ido.vestedInvestments(acc1Address))
            .totalContribution;
          expect(totalContribution).to.equal(minContribution);
        });

        it("Should be able to invest up to the max contribution, then fail", async function () {
          const fixture = await loadFixture(activatedFixture);
          const contribution = maxContribution / 4n;

          for (let i = 0; i < 4; i++) {
            await fixture.idoAsAcc1.invest({ value: contribution });
            expect(
              (await fixture.ido.vestedInvestments(fixture.acc1Address)).totalContribution
            ).to.equal(contribution * BigInt(i + 1));
          }

          expect(
            (await fixture.ido.vestedInvestments(fixture.acc1Address)).totalContribution
          ).to.equal(maxContribution);

          await expect(fixture.idoAsAcc1.invest({ value: contribution })).to.be.revertedWith(
            "New total contribution exceeds personal limit"
          );
        });
      });

      describe("Single Investor Investment", function () {
        let fixture: Fixture;
        const tokenPrice = idoParamsObj._tokenPrice;
        let tokensToBuy: bigint;
        let investorAddress: string;
        const contribution = idoParamsObj._minContribution;

        before(async function () {
          fixture = await loadFixture(activatedFixture);

          tokensToBuy = contribution / tokenPrice;

          await fixture.idoAsAcc1.invest({ value: contribution });
          investorAddress = await fixture.ido.investors(0);
        });

        it(`Should have the investor address as the other account`, async function () {
          expect(investorAddress).to.equal(fixture.acc1Address);
        });

        it(`Should have a total raised equal to the sum of the contribution`, async function () {
          expect(await fixture.ido.totalRaised()).to.equal(contribution);
        });

        it(`Should reflect the increase in the totalContribution of the investor`, async function () {
          expect((await fixture.ido.vestedInvestments(investorAddress)).totalContribution).to.equal(
            contribution
          );
        });

        it(`Should reflect in the increase of the investor tokens vested`, async function () {
          expect((await fixture.ido.vestedInvestments(investorAddress)).totalTokensBought).to.equal(
            tokensToBuy
          );
        });

        it(`Should have added the investor to the array of investors`, async function () {
          expect(await fixture.ido.investors(0)).to.equal(fixture.acc1Address);
          expect(await fixture.ido.investorsLength()).to.equal(1);
        });

        it(`Should be able to invest again`, async function () {
          await fixture.idoAsAcc1.invest({ value: contribution });
          expect(await fixture.ido.totalRaised()).to.equal(contribution * 2n);
        });

        it(`Should reflect the increase in the totalContribution of the investor`, async function () {
          expect((await fixture.ido.vestedInvestments(investorAddress)).totalContribution).to.equal(
            contribution * 2n
          );
        });

        it(`Should reflect in the increase of the investor tokens vested`, async function () {
          expect((await fixture.ido.vestedInvestments(investorAddress)).totalTokensBought).to.equal(
            tokensToBuy * 2n
          );
        });

        it(`Should not have added the investor to the array of investors again`, async function () {
          expect(await fixture.ido.investors(0)).to.equal(fixture.acc1Address);
          expect(await fixture.ido.investorsLength()).to.equal(1);
        });
      });

      describe("Investment with multiple investors", function () {
        let fixture: Fixture;
        const contribution1 = idoParamsObj._minContribution;
        const contribution2 = idoParamsObj._minContribution * 2n;
        const contribution3 = idoParamsObj._minContribution * 3n;
        const tokenPrice = idoParamsObj._tokenPrice;
        const tokensToBuy1 = contribution1 / tokenPrice;
        const tokensToBuy2 = contribution2 / tokenPrice;
        const tokensToBuy3 = contribution3 / tokenPrice;
        let investorAddress1: string;
        let investorAddress2: string;
        let investorAddress3: string;

        before(async function () {
          fixture = await loadFixture(activatedFixture);

          await fixture.idoAsAcc1.invest({ value: contribution1 });
          investorAddress1 = fixture.acc1Address;

          await fixture.idoAsAcc2.invest({ value: contribution2 });
          investorAddress2 = fixture.acc2Address;

          await fixture.idoAsAcc3.invest({ value: contribution3 });
          investorAddress3 = fixture.acc3Address;
        });

        it(`Should have the investor addresses correctly included in the investors array`, async function () {
          expect(investorAddress1).to.equal(await fixture.ido.investors(0));
          expect(investorAddress2).to.equal(await fixture.ido.investors(1));
          expect(investorAddress3).to.equal(await fixture.ido.investors(2));
        });

        it(`Should have a total raised equal to the sum of the contributions inside the IDO`, async function () {
          expect(await fixture.ido.totalRaised()).to.equal(
            contribution1 + contribution2 + contribution3
          );
        });

        it(`Should reflect the increase in the totalContribution of the investors`, async function () {
          expect(
            (await fixture.ido.vestedInvestments(investorAddress1)).totalContribution
          ).to.equal(contribution1);
          expect(
            (await fixture.ido.vestedInvestments(investorAddress2)).totalContribution
          ).to.equal(contribution2);
          expect(
            (await fixture.ido.vestedInvestments(investorAddress3)).totalContribution
          ).to.equal(contribution3);
        });

        it(`Investors should now have their tokens vested`, async function () {
          expect(
            (await fixture.ido.vestedInvestments(investorAddress1)).totalTokensBought
          ).to.equal(tokensToBuy1);
          expect(
            (await fixture.ido.vestedInvestments(investorAddress2)).totalTokensBought
          ).to.equal(tokensToBuy2);
          expect(
            (await fixture.ido.vestedInvestments(investorAddress3)).totalTokensBought
          ).to.equal(tokensToBuy3);
        });
      });

      describe("Reaching the Soft Cap", function () {
        let fixture: Fixture;
        const softCap = idoParamsObj._softCap;
        const minContribution = idoParamsObj._minContribution;

        // Set the max contribution to a high number to avoid reaching the max contribution cap
        before(async function () {
          fixture = await loadFixture(higherMaxContributionFixture);
          expect(await fixture.ido.maxContribution()).to.equal(HIGHER_MAX_CONTRIBUTION);

          const hasReachedSoftCap = await fixture.ido.reachedSoftCap();
          expect(hasReachedSoftCap).to.equal(false);
        });

        it(`Should be able to invest, pass the softCap then set reachedSoftCap as true and emit appropiate event.`, async function () {
          await fixture.idoAsAcc1.invest({ value: softCap - minContribution });
          expect(await fixture.ido.totalRaised()).to.equal(softCap - minContribution);
          expect(await fixture.ido.reachedSoftCap()).to.equal(false);

          await expect(fixture.idoAsAcc1.invest({ value: minContribution }))
            .to.emit(fixture.ido, "ReachedSoftCap")
            .withArgs(softCap);

          expect(await fixture.ido.totalRaised()).to.equal(softCap);
          expect(await fixture.ido.reachedSoftCap()).to.equal(true);
        });

        it(`Should be able to continue investing after passing the soft cap`, async function () {
          await fixture.idoAsAcc1.invest({ value: minContribution });
          expect(await fixture.ido.totalRaised()).to.equal(softCap + minContribution);
        });
      });

      describe("Reaching the Hard Cap", function () {
        let fixture: Fixture;
        const hardCap = idoParamsObj._hardCap;
        const minContribution = idoParamsObj._minContribution;

        // Set the max contribution to a high number to avoid reaching the hard cap
        before(async function () {
          fixture = await loadFixture(higherMaxContributionFixture);
          expect(await fixture.ido.maxContribution()).to.equal(HIGHER_MAX_CONTRIBUTION);

          const hasReachedSoftCap = await fixture.ido.reachedSoftCap();
          expect(hasReachedSoftCap).to.equal(false);
        });

        it(`Should be able to invest up to the hard cap, then set reachedHardCap in true and emit appropiate event`, async function () {
          expect(await fixture.spaceERC20.balanceOf(fixture.idoAddress)).to.equal(500000);

          await fixture.idoAsAcc1.invest({ value: hardCap - minContribution });
          expect(await fixture.ido.totalRaised()).to.equal(hardCap - minContribution);
          expect(await fixture.ido.reachedHardCap()).to.equal(false);

          await expect(fixture.idoAsAcc1.invest({ value: minContribution }))
            .to.emit(fixture.ido, "ReachedHardCap")
            .withArgs(hardCap)
            .to.emit(fixture.ido, "FinalizeIdoCalled")
            .withArgs(hardCap)
            .to.emit(fixture.ido, "StateCompleted")
            .withArgs(hardCap);

          expect(await fixture.ido.totalRaised()).to.equal(hardCap);
          expect(await fixture.ido.reachedHardCap()).to.equal(true);
        });

        it(`Should set the contract state to Completed as a side effect`, async function () {
          expect(await fixture.ido.state()).to.equal(3);
        });

        it(`Should not be able to continue investing after passing the hard cap (Completed State)`, async function () {
          await expect(fixture.idoAsAcc1.invest({ value: minContribution })).to.be.revertedWith(
            "IDO is not in Active State"
          );
        });
      });
    });

    describe("FinalizeIDO", function () {
      describe("Internal call via invest()", function () {
        let fixture: Fixture;
        const hardCap = idoParamsObj._hardCap;
        const tokensToBuy = hardCap / idoParamsObj._tokenPrice;

        // Set the max contribution to a high number to avoid reaching the hard cap
        before(async function () {
          fixture = await loadFixture(higherMaxContributionFixture);
          expect(await fixture.ido.maxContribution()).to.equal(HIGHER_MAX_CONTRIBUTION);

          const hasReachedSoftCap = await fixture.ido.reachedSoftCap();
          expect(hasReachedSoftCap).to.equal(false);
        });

        it(`Should call finalizeIdo when reaching the hard cap`, async function () {
          expect(await fixture.ido.reachedHardCap()).to.equal(false);

          expect(await fixture.idoAsAcc1.invest({ value: hardCap }))
            .to.emit(fixture.ido, "calledFinalizeIdo")
            .withArgs(hardCap)
            .to.emit(fixture.ido, "StateCompleted");
        });

        it(`Should set the contract state to Completed `, async function () {
          expect(await fixture.ido.state()).to.equal(3);
        });

        it(`Should have sent the raised funds to the owner`, async function () {
          expect(await fixture.owner.provider.getBalance(fixture.idoAddress)).to.equal(0);

          expect(await fixture.owner.provider.getBalance(fixture.ownerAddress)).to.equal(
            fixture.initialOwnerBalance + hardCap
          );
        });

        it(`Should have transferred the remaining tokens to the owner`, async function () {
          const remainingTokens = 500000n - tokensToBuy;

          expect(await fixture.spaceERC20.balanceOf(fixture.ownerAddress)).to.equal(
            remainingTokens
          );
        });

        it(`Should have his tokensBought in the VestingInvestment`, async function () {
          const investorAddress = fixture.acc1Address;
          const vestingInvestment = await fixture.ido.vestedInvestments(investorAddress);
          expect(vestingInvestment.totalTokensBought).to.equal(tokensToBuy);
        });
      });

      describe("External call via performUpkeep()", function () {
        const investingPhaseInSeconds = daysToSeconds(idoParamsObj._investingPhaseInDays);

        it(`Should not be able to call finalizeIdo if not in Active State`, async function () {
          const fixture = await loadFixture(defaultFixture);
          expect(await fixture.ido.state()).to.equal(0);
          await expect(fixture.ido.performUpkeep("0x")).to.be.revertedWith("No ukpeeep needed");
        });

        it(`Should not be able to call finalizeIdo if investingPhase has not finished`, async function () {
          const fixture = await loadFixture(activatedFixture);
          expect(await fixture.ido.state()).to.equal(1);

          // https://hardhat.org/hardhat-network-helpers/docs/reference
          // Processing a transaction includes a new block which takes 1 second
          // So investingPhaseInSeconds - 1 would become investingPhaseInSeconds
          // after fixture.ido.performUpkeep("0x") and this would fail.
          await time.increase(investingPhaseInSeconds - 2);

          const investingPhaseHasFinished = await fixture.ido.investingPhaseShouldFinish();
          expect(investingPhaseHasFinished).to.equal(false);

          await expect(fixture.ido.performUpkeep("0x")).to.be.revertedWith("No ukpeeep needed");
        });

        it(`Should be able to call finalizeIdo if in Active State and investingPhase has finished and state is Active`, async function () {
          const fixture = await loadFixture(activatedFixture);
          await time.increase(investingPhaseInSeconds);

          expect(await fixture.ido.state()).to.equal(1);
          const investingPhaseHasFinished2 = await fixture.ido.investingPhaseShouldFinish();
          expect(investingPhaseHasFinished2).to.equal(true);

          await expect(await fixture.ido.performUpkeep("0x")).to.emit(
            fixture.ido,
            "FinalizeIdoCalled"
          );
        });

        describe(`Complete the IDO if the soft cap has been reached`, async function () {
          let fixture: Fixture;
          const softCap = idoParamsObj._softCap;
          let performCost: bigint;

          before(async function () {
            fixture = await loadFixture(higherMaxContributionFixture);
            await time.increase(investingPhaseInSeconds);

            await fixture.idoAsAcc1.invest({ value: softCap });

            const tx = await fixture.ido.performUpkeep("0x");

            performCost = await getCost(tx);

            await expect(tx)
              .to.emit(fixture.ido, "FinalizeIdoCalled")
              .to.emit(fixture.ido, "StateCompleted");
          });

          it(`Should set the contract state to Completed`, async function () {
            expect(await fixture.ido.state()).to.equal(3);
          });

          it(`Should have sent the raised funds to the owner`, async function () {
            expect(await fixture.owner.provider.getBalance(fixture.idoAddress)).to.equal(0);

            expect(await fixture.owner.provider.getBalance(fixture.ownerAddress)).to.equal(
              fixture.initialOwnerBalance - performCost + softCap
            );
          });

          it(`Should have transferred the remaining tokens to the owner and kept all the bought tokens`, async function () {
            const tokenPrice = idoParamsObj._tokenPrice;
            const tokensToBuy = (await fixture.ido.softCap()) / tokenPrice;

            expect(await fixture.spaceERC20.balanceOf(fixture.idoAddress)).to.equal(tokensToBuy);

            expect(await fixture.spaceERC20.balanceOf(fixture.ownerAddress)).to.equal(
              BigInt(MINT_TOKENS) - tokensToBuy
            );
          });

          it(`Should have his totalContribution in the VestingInvestment`, async function () {
            expect(
              (await fixture.ido.vestedInvestments(fixture.acc1Address)).totalContribution
            ).to.equal(await fixture.ido.softCap());
          });

          it("Should have his tokensBought in the VestingInvestment", async function () {
            const tokenPrice = idoParamsObj._tokenPrice;
            const tokensToBuy = (await fixture.ido.softCap()) / tokenPrice;
            expect(
              (await fixture.ido.vestedInvestments(fixture.acc1Address)).totalTokensBought
            ).to.equal(tokensToBuy);
          });
        });

        describe(`Should refund all investors if the soft cap has not been reached`, async function () {
          let fixture: Fixture;
          let investmentCost: bigint;
          let softCap = idoParamsObj._softCap;
          let minContribution = idoParamsObj._minContribution;

          before(async function () {
            fixture = await loadFixture(higherMaxContributionFixture);
            await time.increase(investingPhaseInSeconds);

            // do not pass the soft cap
            investmentCost = await getCost(
              await fixture.idoAsAcc1.invest({
                value: softCap - minContribution,
              })
            );

            const hasReachedSoftCap = await fixture.ido.reachedSoftCap();
            expect(hasReachedSoftCap).to.equal(false);

            await expect(await fixture.ido.performUpkeep("0x"))
              .to.emit(fixture.ido, "FinalizeIdoCalled")
              .to.emit(fixture.ido, "StateRefunded");
          });

          it(`Should set the contract state to Refunded`, async function () {
            expect(await fixture.ido.state()).to.equal(2);
          });

          it(`Should have refunded the investors`, async function () {
            const investorBalance = await fixture.owner.provider.getBalance(fixture.acc1Address);

            const contributionMade = (await fixture.ido.vestedInvestments(fixture.acc1Address))
              .totalContribution;
            const tokensBought = (await fixture.ido.vestedInvestments(fixture.acc1Address))
              .totalTokensBought;

            // Should have reseted the investor contributions and tokens bought record
            expect(contributionMade).to.equal(0);
            expect(tokensBought).to.equal(0);

            const expectedBalance = fixture.initialAcc1Balance - investmentCost;
            expect(investorBalance).to.equal(expectedBalance);
          });

          it(`Should have transferred all the tokens to the owner`, async function () {
            expect(await fixture.owner.provider.getBalance(fixture.idoAddress)).to.equal(0);

            expect(await fixture.spaceERC20.balanceOf(fixture.ownerAddress)).to.equal(MINT_TOKENS);
          });
        });
      });
    });
  });
  describe("Vesting", function () {
    describe("InvestingPhaseHasFinished", function () {
      //@TBD
      it("", async function () {
        expect(true).to.equal(true);
      });
    });
    describe("vestedPeriodicPaymentHasToBeDone", function () {
      //@TBD
      it("", async function () {
        expect(true).to.equal(true);
      });
    });
    describe("vestedPeriodicPayment", function () {
      //@TBD
      it("", async function () {
        expect(true).to.equal(true);
      });
    });
  });
  describe("Automation", function () {
    describe("checkUpkeep", function () {
      //@TBD
      it("", async function () {
        expect(true).to.equal(true);
      });
    });
    describe("performUpkeep", function () {
      //@TBD
      it("", async function () {
        expect(true).to.equal(true);
      });
    });
  });
});
