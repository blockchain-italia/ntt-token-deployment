import { ethers, Wallet } from "ethers";
import { AdapterType, LoanTypeId } from "@folks-finance/xchain-sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { convertStringToBytes } from "../../test/utils/bytes";
import CONFIG from "../testnet/config.json";
import POOLS from "../testnet/pools.json";
import { Feed } from "./priceNodes";

export type ChainDescription = "avalancheFuji" | "ethereumSepolia" | "baseSepolia" | "arbitrumSepolia" | "bscTestnet";

export type LoanTypeDescription = "deposit" | "general";

export type TokenTypeDescription = "native" | "erc20" | "circle";

export type TokenDescription =
  | "USDC"
  | "AVAX"
  | "ETH_eth_sep"
  | "ETH_base_sep"
  | "ETH_arb_sep"
  | "LINK_eth_sep"
  | "BNB";

const DEPLOYED_CONTRACTS_FILE_PATH = "scripts/testnet/deployedContracts.json";

const EMPTY_DEPLOYED_ADDRESSES = (hubDescription: ChainDescription): DeployedContracts => ({
  hub: {
    description: hubDescription,
    bridgeRouter: "",
    hubAdapter: "",
    wormholeDataAdapter: "",
    wormholeCCTPAdapter: "",
    ccipDataAdapter: "",
    ccipTokenAdapter: "",
    hubContract: "",
    nodeManager: "",
    oracleManager: "",
    spokeManager: "",
    accountManager: "",
    loanManager: "",
    libraries: {
      userLoanLogic: "",
      loanPoolLogic: "",
      liquidationLogic: "",
      loanManagerLogic: "",
      rewardLogic: "",
      hubPoolLogic: "",
    },
    loanTypes: {},
    tokens: {},
  },
  spokes: {},
});

export const EMPTY_HUB_TOKEN_DATA = (
  tokenType: TokenTypeDescription,
  poolId: number,
  tokenAddress: string,
  tokenDecimals: number
): HubTokenData => ({
  tokenType,
  poolId,
  poolAddress: "",
  priceNodeId: "",
  tokenAddress,
  tokenDecimals,
  supportedLoanTypes: [],
});

export const EMPTY_SPOKE_TOKEN_DATA = (
  tokenType: TokenTypeDescription,
  poolId: number,
  tokenAddress: string,
  tokenDecimals: number
): SpokeTokenData => ({
  tokenType,
  poolId,
  spokeAddress: "",
  tokenAddress,
  tokenDecimals,
});

const EMPTY_SPOKE_CONTRACT: SpokeContract = {
  bridgeRouter: "",
  wormholeDataAdapter: "",
  wormholeCCTPAdapter: "",
  ccipDataAdapter: "",
  ccipTokenAdapter: "",
  spokeCommon: "",
  spokeTokens: {},
};

export interface SpokeTokenData {
  tokenType: TokenTypeDescription;
  poolId: number;
  spokeAddress: string;
  tokenAddress: string;
  tokenDecimals: number;
}

export interface HubTokenData {
  tokenType: TokenTypeDescription;
  poolId: number;
  poolAddress: string;
  priceNodeId: string;
  tokenAddress: string;
  tokenDecimals: number;
  supportedLoanTypes: LoanTypeDescription[];
}

export interface ChainInfo {
  description: ChainDescription;
  folksChainId: number;
  rpc: string;
  addressOracle: string;
  wormhole: {
    wormholeChainId: number;
    wormholeCore: string;
    wormholeRelayer: string;
    refundAddress: string;
  };
  ccip: {
    ccipChainId: string;
    ccipRouter: string;
  };
  cctp: {
    USDCAddress: string;
    cctpSourceDomain: number;
    circleTokenMessenger: string;
    circleMessageTransmitter: string;
  };
}

export interface LoanTypeInfo {
  description: LoanTypeDescription;
  loanTypeId: number;
  loanTargetHealth: string;
}

export interface LoanPoolInfo {
  description: LoanTypeDescription;
  collateralFactor: string;
  collateralCap: number;
  borrowFactor: string;
  borrowCap: number;
  liquidationBonus: string;
  liquidationFee: string;
  rewardCollateralSpeed: string; // (18+token_decimals) decimals e.g. 1 = 1e24
  rewardBorrowSpeed: string; // (18+token_decimals) decimals e.g. 1 = 1e24
  rewardMinimumAmount: string; // e.g. 100 = 100e6 USDC
}

export interface PoolInfo {
  description: TokenDescription;
  tokenType: TokenTypeDescription;
  listData: {
    poolId: number;
    hubTokenAddress: string;
    spokeTokenAddresses: {
      chain: ChainDescription;
      tokenAddress: string;
    }[];
    fTokenName: string;
    fTokenSymbol: string;
    tokenDecimals: number;
  };
  oracleData: {
    feedId: Feed;
    backupConstantPrice: string;
  };
  poolData: {
    bucketConfig: {
      period: number;
      offset: number;
      limit: number; // e.g. 100 = 100e6 USDC
      minBucketLimit?: number; // e.g. 5 = 5e6 USDC
    };
    feeData: {
      flashLoanFee: string;
      retentionRate: string;
    };
    depositData: {
      optimalUtilisationRatio: string;
    };
    variableBorrowData: {
      vr0: string;
      vr1: string;
      vr2: string;
    };
    stableBorrowData: {
      sr0: string;
      sr1: string;
      sr2: string;
      sr3: string;
      optimalStableToTotalDebtRatio: string;
      rebalanceUpUtilisationRatio: string;
      rebalanceUpDepositInterestRate: string;
      rebalanceDownDelta: string;
    };
    capsData: {
      deposit: number;
      borrow: number;
      stableBorrowPercentage: string;
    };
    configData: {
      deprecated: boolean;
      stableBorrowSupported: boolean;
      canMintFToken: boolean;
      flashLoanSupported: boolean;
    };
  };
  loans: Partial<Record<LoanTypeDescription, LoanPoolInfo>>;
}

export interface Config {
  hub: ChainInfo;
  spokes: ChainInfo[];
}

export interface Pools {
  loanTypes: Partial<Record<LoanTypeDescription, LoanTypeInfo>>;
  pools: Partial<Record<TokenDescription, PoolInfo>>;
}

export interface DeployedContracts {
  hub: HubContract;
  spokes: Spokes;
}

export interface HubContract {
  description: ChainDescription;
  bridgeRouter: string;
  wormholeDataAdapter: string;
  wormholeCCTPAdapter: string;
  ccipDataAdapter: string;
  ccipTokenAdapter: string;
  hubAdapter: string;
  hubContract: string;
  nodeManager: string;
  oracleManager: string;
  spokeManager: string;
  accountManager: string;
  loanManager: string;
  libraries: {
    userLoanLogic: string;
    loanPoolLogic: string;
    liquidationLogic: string;
    loanManagerLogic: string;
    rewardLogic: string;
    hubPoolLogic: string;
  };
  loanTypes: Partial<Record<LoanTypeDescription, LoanTypeId>>;
  tokens: Partial<Record<TokenDescription, HubTokenData>>;
}

interface Spokes {
  [key: string]: SpokeContract;
}

export interface SpokeContract {
  bridgeRouter: string;
  wormholeDataAdapter: string;
  wormholeCCTPAdapter: string;
  ccipDataAdapter: string;
  ccipTokenAdapter: string;
  spokeCommon: string;
  spokeTokens: Partial<Record<TokenDescription, SpokeTokenData>>;
}

export function getSpokesInclHub(chainsConfig: Config): ChainInfo[] {
  return [chainsConfig.hub, ...chainsConfig.spokes];
}

export function getChain(chainId: number): ChainInfo {
  const chain = getSpokesInclHub(loadConfig()).find((c) => c.folksChainId === chainId);
  if (!chain) throw new Error(`Chain ${chainId} not found`);
  return chain;
}

export function getWallet(chainId: number): Wallet {
  let rpcEnv = loadConfig().spokes.find((c) => c.folksChainId === chainId)?.rpc;
  if (chainId === 1) rpcEnv = loadConfig().hub.rpc;

  const rpc = process.env[rpcEnv!]!;
  const provider = new ethers.JsonRpcProvider(rpc);

  if (!process.env.WALLET_PRIVATE_KEY_DEV1)
    throw Error("No private key provided (use the WALLET_PRIVATE_KEY_DEV1 environment variable)");
  return new Wallet(process.env.WALLET_PRIVATE_KEY_DEV1!, provider);
}

let _config: Config | undefined;
let _pools: Pools | undefined;
let _deployedContracts: DeployedContracts | undefined;

export function loadConfig(): Config {
  if (!_config) _config = CONFIG as Config;
  return _config!;
}

export function loanPools(): Pools {
  if (!_pools) _pools = POOLS as Pools;
  return _pools!;
}

export function createEmptyDeployedContracts(chains: ChainDescription[]): DeployedContracts {
  // fail if file already exists
  if (_deployedContracts || existsSync(DEPLOYED_CONTRACTS_FILE_PATH))
    throw Error("Cannot override existing deployed contracts file");

  // add empty hub and spokes - assume first chain is hub chain
  const deployedContracts = EMPTY_DEPLOYED_ADDRESSES(chains[0]);
  for (const chain of chains) deployedContracts.spokes[chain] = EMPTY_SPOKE_CONTRACT;

  // write and return
  writeFileSync(DEPLOYED_CONTRACTS_FILE_PATH, JSON.stringify(deployedContracts, null, 2) + "\n");
  return deployedContracts;
}

export function loadDeployedContracts(): DeployedContracts {
  if (!_deployedContracts)
    _deployedContracts = JSON.parse(readFileSync("scripts/testnet/deployedContracts.json", { encoding: "utf-8" }));
  return _deployedContracts!;
}

export function storeDeployedContracts(deployed: DeployedContracts) {
  writeFileSync(DEPLOYED_CONTRACTS_FILE_PATH, JSON.stringify(deployed, null, 2) + "\n");
}

// Function to get an address of hub adapter by the adapter type
export function getHubAdapterAddressByType(adapterType: AdapterType, hub: HubContract): string {
  switch (adapterType) {
    case AdapterType.HUB:
      return hub.hubAdapter;
    case AdapterType.WORMHOLE_DATA:
      return hub.wormholeDataAdapter;
    case AdapterType.WORMHOLE_CCTP:
      return hub.wormholeCCTPAdapter;
    case AdapterType.CCIP_DATA:
      return hub.ccipDataAdapter;
    case AdapterType.CCIP_TOKEN:
      return hub.ccipTokenAdapter;
    default:
      throw Error("Unknown adapter type");
  }
}

// Function to get an address of spoke adapter by the adapter type
export function getSpokeAdapterAddressByType(adapterType: AdapterType, spoke: SpokeContract, hub: HubContract): string {
  switch (adapterType) {
    case AdapterType.HUB:
      return hub.hubAdapter;
    case AdapterType.WORMHOLE_DATA:
      return spoke.wormholeDataAdapter;
    case AdapterType.WORMHOLE_CCTP:
      return spoke.wormholeCCTPAdapter;
    case AdapterType.CCIP_DATA:
      return spoke.ccipDataAdapter;
    case AdapterType.CCIP_TOKEN:
      return spoke.ccipTokenAdapter;
    default:
      throw Error("Unknown adapter type");
  }
}

export const MESSAGE_SENDER_ROLE = ethers.keccak256(convertStringToBytes("MESSAGE_SENDER"));
export const HUB_ROLE = ethers.keccak256(convertStringToBytes("HUB"));

// Token and NTT related types

export type NttTokenDescription = "FolksToken" | "WormholeToken" | "ETH_eth_sep" | "ETH_base_sep" | "LINK_eth_sep";

let _deployedNttContracts: undefined;
let _nttManagersConfig: NttManagerConfig[] | undefined;

export interface NttToken {
  tokenName: string;
  tokenSymbol: string;
  minter: string;
  owner: string;
}

const DEPLOYED_NTT_CONTRACTS_FILE_PATH = "scripts/testnet/deployedNTTContracts.json";

const EMPTY_DEPLOYED_NTT_ADDRESSES = (hubDescription: ChainDescription): DeployedNttContracts => ({
  hub: {
    description: hubDescription,
    nttToken: "",
    nttManagerImplementation: "",
    nttManagerProxy: "",
    nttTransceiverImplementation: "",
    nttTransceiverProxy: "",
    nttTransceiverStructs: ""
  },
  spokes: {},
});

const EMPTY_SPOKE_NTT_CONTRACT: SpokeNttContract = {
  nttToken: "",
  nttManagerImplementation: "",
  nttManagerProxy: "",
  nttTransceiverImplementation: "",
  nttTransceiverProxy: "",
  nttTransceiverStructs: ""
};

export interface DeployedNttContracts {
  hub: HubNttContract;
  spokes: SpokeNttContracts;
}

export interface HubNttContract {
  description: ChainDescription;
  nttToken: string;
  nttManagerImplementation: string;
  nttManagerProxy: string;
  nttTransceiverImplementation: string;
  nttTransceiverProxy: string;
  nttTransceiverStructs: string;
}

export interface SpokeNttContract {
  nttToken: string,
  nttManagerImplementation: string;
  nttManagerProxy: string;
  nttTransceiverImplementation: string;
  nttTransceiverProxy: string;
  nttTransceiverStructs: string;
}

export type NttManagerConfig = {
  description: ChainDescription;
  token: string;
  mode: number;
  chainId: number;
  rateLimitDuration: number;
  skipRateLimit: boolean;
  threshold: number;
  outboundLimit: number;
};

interface SpokeNttContracts {
  [key: string]: SpokeNttContract;
}

export function createEmptyDeployedNttContracts(chains: ChainDescription[]): DeployedNttContracts {
  // fail if file already exists
  if (_deployedNttContracts || existsSync(DEPLOYED_NTT_CONTRACTS_FILE_PATH))
    throw Error("Cannot override existing deployed contracts file");

  // add empty hub and spokes - assume first chain is hub chain
  const deployedNttContracts = EMPTY_DEPLOYED_NTT_ADDRESSES(chains[0]);

  // iterate over all chains except the first one
  for (const chain of chains.slice(1)) {
    deployedNttContracts.spokes[chain] = EMPTY_SPOKE_NTT_CONTRACT;
  }

  // write and return
  writeFileSync(DEPLOYED_NTT_CONTRACTS_FILE_PATH, JSON.stringify(deployedNttContracts, null, 2) + "\n");
  return deployedNttContracts;
}

export function loadDeployedNttContracts(): DeployedNttContracts {
  if (!_deployedNttContracts)
    _deployedNttContracts = JSON.parse(readFileSync("scripts/testnet/deployedNTTContracts.json", { encoding: "utf-8" }));
  return _deployedNttContracts!;
}

export function storeDeployedNttContracts(deployed: DeployedNttContracts) {
  writeFileSync(DEPLOYED_NTT_CONTRACTS_FILE_PATH, JSON.stringify(deployed, null, 2) + "\n");
}

export function loadNttManagersConfig(): NttManagerConfig[] {
  if (!_nttManagersConfig)
    _nttManagersConfig = JSON.parse(readFileSync("scripts/testnet/nttManagers.json", { encoding: "utf-8" }));
  return _nttManagersConfig!;
}

