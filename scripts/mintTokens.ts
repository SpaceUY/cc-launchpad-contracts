import hre from "hardhat";
import { idoParamsArray } from "../params";
import { parseEther } from "ethers";

async function main() {
  try {
    const spaceERC20 = await hre.ethers.getContractAt(
      "SpaceERC20",
      "0x5d5692EFD06118A4B1691fc50AcEc60D8Bc27c28"
    );

    await spaceERC20.mint("0xebbb3a3281ce7956efec3fc4695a5ed87a3aad54", parseEther("500000"));

    console.log("Minted 500,000 tokens to 0xebbb3a3281ce7956efec3fc4695a5ed87a3aad54");
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
