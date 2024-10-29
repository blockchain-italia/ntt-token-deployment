import { ethers, Wallet } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "fs";
import CONFIG from "../testnet/config.json";

export type ChainDescription = "avalancheFuji" | "ethereumSepolia" | "baseSepolia" | "arbitrumSepolia" | "bscTestnet";

export type NttTokenDescription = "FolksToken" | "WormholeToken";
export interface ChainInfo {
  description: ChainDescription;
  folksChainId: number;
  rpc: string;
  wormhole: {
    wormholeChainId: number;
    wormholeCore: string;
    wormholeRelayer: string;
    refundAddress: string;
  };
}
export interface Config {
  hub: ChainInfo;
  spokes: ChainInfo[];
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

let _deployedNttContracts: undefined;
let _nttManagersConfig: NttManagerConfig[] | undefined;
let _config: Config | undefined;

export function loadConfig(): Config {
  if (!_config) _config = CONFIG as Config;
  return _config!;
}
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
    nttTransceiverStructs: "",
  },
  spokes: {},
});

const EMPTY_SPOKE_NTT_CONTRACT: SpokeNttContract = {
  nttToken: "",
  nttManagerImplementation: "",
  nttManagerProxy: "",
  nttTransceiverImplementation: "",
  nttTransceiverProxy: "",
  nttTransceiverStructs: "",
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
  nttToken: string;
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
  outboundLimit: string;
  inboundLimit: { chainId: number; limit: string }[];
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
    _deployedNttContracts = JSON.parse(
      readFileSync("scripts/testnet/deployedNTTContracts.json", { encoding: "utf-8" })
    );
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
