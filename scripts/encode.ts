import { ethers } from "hardhat";
import { idoParamsObj } from "../params";

const types = [
  "address",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
];

const values = [
  idoParamsObj._tokenAddress,
  idoParamsObj._tokenPrice,
  idoParamsObj._minContribution,
  idoParamsObj._maxContribution,
  idoParamsObj._softCap,
  idoParamsObj._hardCap,
  idoParamsObj._investingPhaseInDays,
  idoParamsObj._vestingCliffInDays,
  idoParamsObj._vestingTotalPeriods,
  idoParamsObj._vestingPeriodInDays,
  idoParamsObj._vestingPeriodPercentage,
];
const coder = ethers.AbiCoder.defaultAbiCoder();
const encodedParams = coder.encode(types, values);
console.log(encodedParams);


// TOKEN
// npx hardhat verify --network mumbai 0xb886c6ef99FF5e487CDB2fEC1D26a3E6D52af837 1000000000000000000000000

// IDO
// npx hardhat verify --network mumbai 0x5D6d541E39836eC01f9726d9606F10a881EC28AA 0xb886c6ef99FF5e487CDB2fEC1D26a3E6D52af837 "1000000000000000" "1000000000000000" "5000000000000000000" "100000000000000000000" "500000000000000000000" "30" "30" "10" "30" "10"