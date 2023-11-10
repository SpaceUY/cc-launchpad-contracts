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
  _tokenAddress: "0xc0f2B485cFe95B3A1df92dA2966EeB46857fe2a6",
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

// Params for Remix deployment & testing
// 0xc0f2B485cFe95B3A1df92dA2966EeB46857fe2a6, 1000, 100000, 100000, 100000, 100000, 30,30, 10, 30, 10

// AVAILABLE TOKENS 500000n
// TOTAL TOKENS BOUGHT 0n

// hardCap 500000000000000000000n
// minContribution 1000000000000000n

// AVAILABLE TOKENS 500000n
// TOTAL TOKENS BOUGHT 499999n
