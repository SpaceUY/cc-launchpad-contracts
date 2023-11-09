import hre from "hardhat";

async function main() {
  const initialCap = 1000000; // 1 million tokens in wei
  const spaceERC20 = await hre.ethers.deployContract("SpaceERC20", [initialCap], {});

  await spaceERC20.waitForDeployment();

  console.log(`TestERC20 deployed to ${spaceERC20.target} with cap ${initialCap}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
