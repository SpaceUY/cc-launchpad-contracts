import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SpaceERC20 } from "../typechain-types";

describe("SpaceERC20", function () {
  let spaceERC20: SpaceERC20;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2;
  const initialCap = ethers.parseEther("1000000"); // 1 million tokens in wei

  beforeEach(async function () {
    [owner, addr1, addr2] = await hre.ethers.getSigners();
    spaceERC20 = await hre.ethers.deployContract("SpaceERC20", [initialCap], {});
    await spaceERC20.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await spaceERC20.owner()).to.equal(owner.address);
    });

    it("Should respect the token cap", async function () {
      expect(await spaceERC20.cap()).to.equal(initialCap);
    });
  });

  describe("Minting", function () {
    it("Should mint tokens when called by the owner", async function () {
      const mintAmount = ethers.parseEther("100");
      await spaceERC20.mint(owner.address, mintAmount);
      expect(await spaceERC20.balanceOf(owner.address)).to.equal(mintAmount);
    });

    it("Should fail to mint tokens when called by non-owner", async function () {
      const mintAmount = ethers.parseEther("100");
      await expect(
        spaceERC20.connect(addr1).mint(addr1.address, mintAmount)
      ).to.be.revertedWithCustomError(spaceERC20, "OwnableUnauthorizedAccount");
    });

    it("Should not mint tokens beyond the cap", async function () {
      const mintAmount = ethers.parseEther("1000001");
      await expect(spaceERC20.mint(owner.address, mintAmount)).to.be.reverted;
    });
  });

  describe("Burning", function () {
    it("Should allow token holders to burn their tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      const burnAmount = ethers.parseEther("50");
      await spaceERC20.mint(owner.address, mintAmount);
      await spaceERC20.burn(burnAmount);
      expect(await spaceERC20.balanceOf(owner.address)).to.equal(ethers.parseEther("50"));
    });
  });

  describe("Transfers", function () {
    const transferAmount = ethers.parseEther("100");

    beforeEach(async function () {
      await spaceERC20.mint(owner.address, transferAmount);
    });

    it("Should transfer tokens between accounts", async function () {
      await spaceERC20.transfer(addr1.address, transferAmount);
      expect(await spaceERC20.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("Should fail to transfer more tokens than in account", async function () {
      const largeAmount = ethers.parseEther("1000000000");
      await expect(spaceERC20.transfer(addr1.address, largeAmount)).to.be.reverted;
    });

    it("Should fail to transfer to zero address", async function () {
      await expect(spaceERC20.transfer(ethers.ZeroAddress, transferAmount)).to.be.reverted;
    });
  });

  // Additional tests can include permission checks, totalSupply checks, and more.
});
