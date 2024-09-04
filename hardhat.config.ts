import { config as encConfig } from "dotenv";
encConfig();

import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import { HardhatUserConfig } from "hardhat/config";
import "hardhat-deploy";
import "hardhat-gas-reporter";

const AVALANCHE_FUJI_RPC_URL = process.env.AVALANCHE_FUJI_RPC_URL;
const ETHEREUM_SEPOLIA_RPC_URL = process.env.ETHEREUM_SEPOLIA_RPC_URL;
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const ARB_SEPOLIA_RPC_URL = process.env.ARB_SEPOLIA_RPC_URL;
const OPTIMISM_SEPOLIA_RPC_URL = process.env.OPTIMISM_SEPOLIA_RPC_URL;
const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL;

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_DEV1;

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY!;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY!;
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY!;
const OPTIMISMSCAN_API_KEY = process.env.OPTIMISMSCAN_API_KEY!;
const BSCSCANAPI_KEY = process.env.BSCSCANAPI_KEY!;
const CMC_API_KEY = process.env.CMC_API_KEY!;

const config: HardhatUserConfig = {
  gasReporter: {
    enabled: false,
    currency: "USD",
    token: "AVAX",
    gasPrice: 25,
    coinmarketcap: CMC_API_KEY,
  },
  solidity: {
    version: "0.8.23",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  // defaultNetwork: "avalancheFuji",
  // defaultNetwork: "ethereumSepolia",
  // defaultNetwork: "baseSepolia",
  // defaultNetwork: "arbitrumSepolia",
  // defaultNetwork: "optimismSepolia",
  // defaultNetwork: "bscTestnet",
  networks: {
    localhost: {
      chainId: 31337,
    },
    avalancheFuji: {
      url: AVALANCHE_FUJI_RPC_URL,
      chainId: 43113,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    ethereumSepolia: {
      url: ETHEREUM_SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    arbitrumSepolia: {
      url: ARB_SEPOLIA_RPC_URL,
      chainId: 421614,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    optimismSepolia: {
      url: OPTIMISM_SEPOLIA_RPC_URL,
      chainId: 11155420,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      chainId: 97,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: "avalancheFujiTestnet", // apiKey is not required, just set a placeholder
      sepolia: ETHERSCAN_KEY,
      baseSepolia: BASESCAN_API_KEY,
      arbitrumSepolia: ARBISCAN_API_KEY,
      optimismSepolia: OPTIMISMSCAN_API_KEY,
      bscTestnet: BSCSCANAPI_KEY,
    },
  },
};

export default config;
