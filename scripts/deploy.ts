import hre from "hardhat";
import { idoParamsArray } from "../params";
import { parseEther } from "ethers";

async function main() {
  try {
    const cap = parseEther("1000000"); // 1 million tokens in wei
    const spaceERC20 = await hre.ethers.deployContract("SpaceERC20", [cap], {});
    await spaceERC20.waitForDeployment();
    const spaceERC20Address = spaceERC20.target;
    console.log(`SpaceERC20 deployed to ${spaceERC20Address} with cap ${cap}`);

    idoParamsArray[0] = spaceERC20Address as string;
    const ido = await hre.ethers.deployContract("IDO", idoParamsArray, {});
    await ido.waitForDeployment();
    const idoAddress = ido.target;
    console.log(`IDO deployed to ${idoAddress} with token address ${spaceERC20Address}`);

    await spaceERC20.mint(idoAddress, parseEther("500000"));
    console.log(`Minted 500000 tokens to ${idoAddress} for IDO contract`);
  } catch (e) {
    console.log(e);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
