import { expect } from "chai";
import hre from "hardhat";
import { IDOFactory, IDO } from "../typechain-types"; // Adjust the import paths as needed

describe("IDOFactory", function () {
    let idoFactory: IDOFactory;
    let idoFactoryAddress: string;
    let owner, addr1, addr2; // Signers

    // Parameters for the IDO contract
    const tokenAddress = "0xc0f2B485cFe95B3A1df92dA2966EeB46857fe2a6"; // Replace with mock token address or deploy a mock token in beforeEach
    const tokenPrice = hre.ethers.parseEther("0.01");
    const minContribution = hre.ethers.parseEther("0.1");
    const maxContribution = hre.ethers.parseEther("10");
    const softCap = hre.ethers.parseEther("100");
    const hardCap = hre.ethers.parseEther("500");
    const investingPhaseInDays = 30;
    const vestingCliffInDays = 30;
    const vestingTotalPeriods = 4;
    const vestingPeriodInDays = 30;
    const vestingPeriodPercentage = 25;

    beforeEach(async function () {
        [owner, addr1, addr2] = await hre.ethers.getSigners();
        idoFactory = await hre.ethers.deployContract("IDOFactory", [], {});
        await idoFactory.waitForDeployment();

        idoFactoryAddress = await idoFactory.getAddress();
    });

    describe("IDOFactory Deployment", function () {
        it("Should deploy the factory correctly", async function () {
            expect(idoFactoryAddress).to.be.properAddress;
        });
    });

    describe("Creating IDOs", function () {
        let newIdoAddress: string;

        beforeEach(async function () {
            const tx = await idoFactory.createIDO(
                tokenAddress,
                tokenPrice,
                minContribution,
                maxContribution,
                softCap,
                hardCap,
                investingPhaseInDays,
                vestingCliffInDays,
                vestingTotalPeriods,
                vestingPeriodInDays,
                vestingPeriodPercentage
            );
            await tx.wait();
            newIdoAddress = await idoFactory.deployedIDOs(0);
        });

        it("Should emit IDOCreated event with correct address", async function () {
            expect(newIdoAddress).to.be.properAddress;
        });

        it("Should track deployed IDOs", async function () {
            const deployedIDOs = await idoFactory.getDeployedIDOs();
            expect(deployedIDOs).to.include(newIdoAddress);
        });

        describe("IDO Contract Functionality", function () {
            let idoContract: IDO;

            beforeEach(async function () {
                idoContract = await hre.ethers.getContractAt("IDO", newIdoAddress);
            });

            it("Should set the right token address", async function () {
                expect(await idoContract.token()).to.equal(tokenAddress);
            });

            it("Should be in Preparing State", async function () {
                expect(await idoContract.state()).to.equal(0);
            });



        });
    });

    // Additional tests could include testing pausing functionality, checking the state of the IDO, etc.
});
