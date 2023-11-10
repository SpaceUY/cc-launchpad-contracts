import { parseEther } from "ethers";
import hre from "hardhat";

async function main() {
  const cap = parseEther("1000000"); // 1 million tokens in wei
  const spaceERC20 = await hre.ethers.deployContract("SpaceERC20", [cap], {});

  await spaceERC20.waitForDeployment();

  console.log(`TestERC20 deployed to ${spaceERC20.target} with cap ${cap}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
