import hre from "hardhat";
import { idoParamsArray } from "../params";

async function main() {
  const erc20Address = "0x5d5692EFD06118A4B1691fc50AcEc60D8Bc27c28";
  idoParamsArray[0] = erc20Address;
  try {
    const ido = await hre.ethers.deployContract("IDO", idoParamsArray, {});

    await ido.waitForDeployment();

    console.log(`IDO deployed to ${ido.target}`);
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
