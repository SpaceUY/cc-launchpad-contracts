import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export const daysToSeconds = (days: number): number => {
  return days * 24 * 60 * 60;
};

export const getCost = async (tx: any): Promise<bigint> => {
  const receipt = await tx.wait();
  const gasUsed = receipt.gasUsed;
  const gasPrice = await tx.gasPrice;
  return BigInt(gasUsed) * BigInt(gasPrice);
};
