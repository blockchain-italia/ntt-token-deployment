import { ethers } from "hardhat";

import {
    HubNttToken__factory,
    SpokeNttToken__factory,
    NttManager__factory,
    TransceiverStructs__factory,
    WormholeTransceiver__factory,
    ERC1967Proxy__factory
} from "../ts-scripts/ethers-contracts";

import {
    loadConfig,
    getWallet,
    createEmptyDeployedNttContracts,
    loadDeployedNttContracts,
    loadNttManagersConfig,
    storeDeployedNttContracts,
    NttManagerConfig,
    ChainDescription,
    Config,
    NttToken,
    DeployedNttContracts,
} from "./utils/scripts";

async function main() {
    // define which chains and adapters to configure
    const chainsToConfigure: ChainDescription[] = [
        "avalancheFuji",
        "ethereumSepolia",
        "baseSepolia"
    ];

    // load chain configs, ntt coonfigs and deployed contracts
    const chainsConfig = loadConfig();
    const deployedNttContracts = loadDeployedNttContracts();
    const nttManagersConfig = loadNttManagersConfig();
}

export async function setTokenMinter(
    chainsToAdd: ChainDescription[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {

    await setMinterForHubNttToken(chainsToAdd, chainsConfig, deployedNttContracts);
    await setMinterForSpokeNttTokens(chainsToAdd, chainsConfig, deployedNttContracts);

    console.log("Minters were set for Ntt tokens");
}

export async function setMinterForHubNttToken(
    chainsToAdd: ChainDescription[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {
    const { hub: hubChainInfo } = chainsConfig;
    const { hub: deployedHub } = deployedNttContracts;
    const { nttToken: nttTokenAddress, nttManagerProxy: hubNttManagerProxy } = deployedHub;
    const signer = getWallet(hubChainInfo.folksChainId);

    if (!chainsToAdd.includes(hubChainInfo.description) || nttTokenAddress === "") return;

    const hubNttToken = HubNttToken__factory.connect(nttTokenAddress, signer);
    const tx = await hubNttToken.setMinter(hubNttManagerProxy);
    await tx.wait();
    console.log(`Minter ${hubNttManagerProxy} was set for hub ntt token: ${nttTokenAddress}`);
}

export async function setMinterForSpokeNttTokens(
    chainsToAdd: ChainDescription[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {
    for (const chain of chainsToAdd) {
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

main().catch(console.error);