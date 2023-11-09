import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "solidity-coverage";
import "hardhat-gas-reporter";

import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "",
      accounts: [process.env.MUMBAI_PRIVATE_KEY || ""],
      chainId: 80001,
    },
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY || "",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};

export default config;
