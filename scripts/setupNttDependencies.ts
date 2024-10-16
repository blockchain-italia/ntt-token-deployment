import { HubNttToken__factory, NttManager__factory } from "../ts-scripts/ethers-contracts";

import {
  loadConfig,
  getWallet,
  loadDeployedNttContracts,
  loadNttManagersConfig,
  NttManagerConfig,
  ChainDescription,
  Config,
  DeployedNttContracts,
} from "./utils/scripts";

async function main() {
  // define which chains and adapters to configure
  const chainsToConfigure: ChainDescription[] = ["avalancheFuji", "ethereumSepolia", "baseSepolia"];

  // load chain configs, ntt coonfigs and deployed contracts
  const chainsConfig = loadConfig();
  const deployedNttContracts = loadDeployedNttContracts();
  const nttManagersConfig = loadNttManagersConfig();

  await setTokenMinter(chainsToConfigure, chainsConfig, deployedNttContracts);
  await configureNttManagers(chainsToConfigure, chainsConfig, deployedNttContracts, nttManagersConfig);
}

main().catch(console.error);

export async function setTokenMinter(
  chainsToSetup: ChainDescription[],
  chainsConfig: Config,
  deployedNttContracts: DeployedNttContracts
) {
  await setMinterForHubNttToken(chainsToSetup, chainsConfig, deployedNttContracts);
  await setMinterForSpokeNttTokens(chainsToSetup, chainsConfig, deployedNttContracts);

  console.log("Minters were set for Ntt tokens");
}

export async function setMinterForHubNttToken(
  chainsToSetup: ChainDescription[],
  chainsConfig: Config,
  deployedNttContracts: DeployedNttContracts
) {
  const { hub: hubChainInfo } = chainsConfig;
  const { hub: deployedHub } = deployedNttContracts;
  const { nttToken: nttTokenAddress, nttManagerProxy: hubNttManagerProxy } = deployedHub;
  const signer = getWallet(hubChainInfo.folksChainId);

  if (!chainsToSetup.includes(hubChainInfo.description) || nttTokenAddress === "") return;

  const hubNttToken = HubNttToken__factory.connect(nttTokenAddress, signer);
  const tx = await hubNttToken.setMinter(hubNttManagerProxy);
  await tx.wait();
  console.log(`Minter ${hubNttManagerProxy} was set for hub ntt token: ${nttTokenAddress}`);
}

export async function setMinterForSpokeNttTokens(
  chainsToSetup: ChainDescription[],
  chainsConfig: Config,
  deployedNttContracts: DeployedNttContracts
) {
  for (const chain of chainsToSetup) {
    const spoke = chainsConfig.spokes.find((spoke) => spoke.description === chain);
    if (!spoke) continue;

    const { description, folksChainId } = spoke;
    const signer = getWallet(folksChainId);

    const deployedNttDependencies = deployedNttContracts.spokes[description];
    const { nttToken: spokeNttTokenAddress, nttManagerProxy: spokeNttManagerProxy } = deployedNttDependencies;

    if (spokeNttTokenAddress === "") continue;

    const spokeNttToken = HubNttToken__factory.connect(spokeNttTokenAddress, signer);
    const tx = await spokeNttToken.setMinter(spokeNttManagerProxy);
    await tx.wait();
    console.log(`Minter ${spokeNttManagerProxy} was set for spoke ntt token: ${spokeNttTokenAddress}`);
  }
}

export async function configureNttManagers(
  chainsToSetup: ChainDescription[],
  chainsConfig: Config,
  deployedNttContracts: DeployedNttContracts,
  nttManagersConfig: NttManagerConfig[]
) {
  await setupHubNttManager(chainsToSetup, chainsConfig, deployedNttContracts, nttManagersConfig);
  await setupSpokesNttManagers(chainsToSetup, chainsConfig, deployedNttContracts, nttManagersConfig);

  console.log("Configuration for Ntt managers succeded");
}

export async function setupHubNttManager(
  chainsToSetup: ChainDescription[],
  chainsConfig: Config,
  deployedNttContracts: DeployedNttContracts,
  nttManagersConfig: NttManagerConfig[]
) {
  const { hub: hubChainInfo } = chainsConfig;
  const { hub: deployedHub } = deployedNttContracts;
  const { nttManagerProxy: hubNttManagerProxy, nttTransceiverProxy: hubTransceiverProxy } = deployedHub;
  const signer = getWallet(hubChainInfo.folksChainId);

  if (!chainsToSetup.includes(hubChainInfo.description) || hubNttManagerProxy === "") return;

  const hubNttManagerConfig = nttManagersConfig.find(
    (chainConfig) => chainConfig.description === hubChainInfo.description
  );
  if (!hubNttManagerConfig) return;

  const hubNttManagerContract = NttManager__factory.connect(hubNttManagerProxy, signer);
  await hubNttManagerContract.setTransceiver(hubTransceiverProxy);
  console.log(`transceiver address set to: ${hubTransceiverProxy}`);

  await hubNttManagerContract.setOutboundLimit(hubNttManagerConfig.outboundLimit);
  console.log(`outboundLimit set to: ${hubNttManagerConfig.outboundLimit}`);

  for (const { limit, chainId } of hubNttManagerConfig.inboundLimit) {
    await hubNttManagerContract.setInboundLimit(chainId, limit);
    console.log(`inboundLimit for chain ${chainId} set to: ${limit}`);
  }

  await hubNttManagerContract.setThreshold(hubNttManagerConfig.threshold);
  console.log(`Threshold configured to: ${hubNttManagerConfig.threshold}`);
}

export async function setupSpokesNttManagers(
  chainsToSetup: ChainDescription[],
  chainsConfig: Config,
  deployedNttContracts: DeployedNttContracts,
  nttManagersConfig: NttManagerConfig[]
) {
  for (const chain of chainsToSetup) {
    const spoke = chainsConfig.spokes.find((spoke) => spoke.description === chain);
    if (!spoke) continue;

    const spokeNttManagerConfig = nttManagersConfig.find((chainConfig) => chainConfig.description === chain);
    if (!spokeNttManagerConfig) continue;

    const { description, folksChainId } = spoke;
    const signer = getWallet(folksChainId);

    const { nttManagerProxy: spokeNttManagerProxy, nttTransceiverProxy: spokeTransceiverProxy } =
      deployedNttContracts.spokes[description];

    const spokeNttManagerContract = NttManager__factory.connect(spokeNttManagerProxy, signer);
    await spokeNttManagerContract.setTransceiver(spokeTransceiverProxy);
    console.log(`transceiver address set to: ${spokeTransceiverProxy}`);

    await spokeNttManagerContract.setOutboundLimit(spokeNttManagerConfig.outboundLimit);
    console.log(`outboundLimit set to: ${spokeNttManagerConfig.outboundLimit}`);

    for (const { limit, chainId } of spokeNttManagerConfig.inboundLimit) {
      await spokeNttManagerContract.setInboundLimit(chainId, limit);
      console.log(`inboundLimit for chain ${chainId} set to: ${limit}`);
    }

    await spokeNttManagerContract.setThreshold(spokeNttManagerConfig.threshold);
    console.log(`Threshold configured to: ${spokeNttManagerConfig.threshold}`);
  }
}
