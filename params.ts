import { parseEther } from "ethers";

export interface IDOParams {
  _tokenAddress: string;
  _tokenPrice: bigint;
  _minContribution: bigint;
  _maxContribution: bigint;
  _softCap: bigint;
  _hardCap: bigint;
  _investingPhaseInDays: number;
  _vestingCliffInDays: number;
  _vestingTotalPeriods: number;
  _vestingPeriodInDays: number;
  _vestingPeriodPercentage: number;
}

export interface IDOParamsConstructor {
  _tokenAddress?: string;
  _tokenPrice?: bigint;
  _minContribution?: bigint;
  _maxContribution?: bigint;
  _softCap?: bigint;
  _hardCap?: bigint;
  _investingPhaseInDays?: number;
  _vestingCliffInDays?: number;
  _vestingTotalPeriods?: number;
  _vestingPeriodInDays?: number;
  _vestingPeriodPercentage?: number;
}

export const spaceERC20ParamsArray = [/* _cap */ 1000000]; // 1M tokens

export const idoParamsObj: IDOParams = {
  _tokenAddress: "",
  _tokenPrice: parseEther("0.001"), // Price in ETH, around 2usd
  _minContribution: parseEther("0.001"), // 1 token
  _maxContribution: parseEther("5"), // 5000 tokens
  _softCap: parseEther("100"), // 100k tokens
  _hardCap: parseEther("500"), // 500k tokens
  _investingPhaseInDays: 30,
  _vestingCliffInDays: 30,
  _vestingTotalPeriods: 10,
  _vestingPeriodInDays: 30,
  _vestingPeriodPercentage: 10,
};

export const idoParamsArray = [
  /* _tokenAddress */ idoParamsObj._tokenAddress,
  /* _tokenPrice */ idoParamsObj._tokenPrice,
  /* _minContribution */ idoParamsObj._minContribution,
  /* _maxContribution */ idoParamsObj._maxContribution,
  /* _softCap */ idoParamsObj._softCap,
  /* _hardCap */ idoParamsObj._hardCap,
  /* _investingPhaseInDays */ idoParamsObj._investingPhaseInDays,
  /* _vestingCliffInDays */ idoParamsObj._vestingCliffInDays,
  /* _vestingTotalPeriods */ idoParamsObj._vestingTotalPeriods,
  /* _vestingPeriodInDays */ idoParamsObj._vestingPeriodInDays,
  /* _vestingPeriodPercentage */ idoParamsObj._vestingPeriodPercentage,
];

export const HIGHER_MAX_CONTRIBUTION = parseEther("1000"); // double of the hard cap
export const MINT_TOKENS = 500000; // 500k tokens, same as hard cap

// npx hardhat verify --network mumbai 0xEBBB3A3281cE7956EFEc3fC4695a5ED87A3aaD54 0x5d5692EFD06118A4B1691fc50AcEc60D8Bc27c28 "1000000000000000" "1000000000000000" "5000000000000000000" "100000000000000000000" "500000000000000000000" "30" "30" "10" "30" "10"
