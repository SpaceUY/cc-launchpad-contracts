import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export const daysToSeconds = (days: number | bigint): bigint => {
  return BigInt(days) * 24n * 60n * 60n;
};

export const getCost = async (tx: any): Promise<bigint> => {
  const receipt = await tx.wait();
  const gasUsed = receipt.gasUsed;
  const gasPrice = await tx.gasPrice;
  return BigInt(gasUsed) * BigInt(gasPrice);
};
