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

// Define the ABI for ERC1967Proxy and bytecode (dummy bytecode is fine here)
const abi = ["function initialize()"];
const bytecode = "0x"; // Dummy bytecode

async function main() {
    // define which chains to deploy on (we assume first chain is hub chain)
    const chainsToDeploy: ChainDescription[] = ["avalancheFuji", "ethereumSepolia", "baseSepolia"];

    // create empty deployed contracts (comment out if already written)
    createEmptyDeployedNttContracts(chainsToDeploy);

    // load chain configs, ntt coonfigs and deployed contracts
    const chainsConfig = loadConfig();
    const deployedNttContracts = loadDeployedNttContracts();
    const nttManagersConfig = loadNttManagersConfig();

    await deployNTTTokenContracts(chainsToDeploy, chainsConfig, deployedNttContracts);
    await deployNttManagers(chainsToDeploy, chainsConfig, deployedNttContracts, nttManagersConfig);
    await deployNttManagersProxy(chainsToDeploy, chainsConfig, deployedNttContracts);
    // After this step we should call token setMinter function 
    // (will be in ntt configuration scripts)
    await deployNttTransceivers(chainsToDeploy, chainsConfig, deployedNttContracts, nttManagersConfig);
    await deployNttTransceiversProxy(chainsToDeploy, chainsConfig, deployedNttContracts);
}

main().catch(console.error);

export async function deployNTTTokenContracts(
    chainsToDeploy: ChainDescription[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {

    const nttToken: NttToken = {
        tokenName: "FolksToken",
        tokenSymbol: "FTKN",
        minter: "0xC5a84964846E74227535aE5750EeF546aC8C357A",
        owner: "0xC5a84964846E74227535aE5750EeF546aC8C357A"
    }

    await deployHubNttTokenContract(chainsToDeploy, chainsConfig, deployedNttContracts, nttToken);
    await deploySpokeNttTokenContracts(chainsToDeploy, chainsConfig, deployedNttContracts, nttToken);

    storeDeployedNttContracts(deployedNttContracts);
    console.log("Deployed NTT token contracts");
}

export async function deployHubNttTokenContract(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
    nttToken: NttToken
) {
    const { hub: hubChainInfo } = chainsConfig;
    const { hub: deployedHub } = deployedNttContracts;
    const signer = getWallet(hubChainInfo.folksChainId);

    if (!chainsToDeploy.includes(hubChainInfo.description)) return;

    const tokenName = nttToken.tokenName;
    const tokenSymbol = nttToken.tokenSymbol;
    const minter = nttToken.minter;
    const owner = nttToken.owner;

    // deploy
    const hubNttTokenContract = await new HubNttToken__factory(signer).deploy(tokenName, tokenSymbol, owner, minter);
    const hubNttTokenAddress = await hubNttTokenContract.getAddress();
    deployedHub.nttToken = hubNttTokenAddress;
    console.log(`Ntt hub token: ${hubNttTokenAddress} on hub chain: ${hubChainInfo.description}`);
}

export async function deploySpokeNttTokenContracts(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
    nttToken: NttToken
) {
    for (const chain of chainsToDeploy) {
        const spoke = chainsConfig.spokes.find((spoke) => spoke.description === chain);
        if (!spoke) continue;

        const { description, folksChainId } = spoke;
        const signer = getWallet(folksChainId);

        const tokenName = nttToken.tokenName;
        const tokenSymbol = nttToken.tokenSymbol;
        const minter = nttToken.minter;
        const owner = nttToken.owner;

        // deploy
        const spokeNttTokenContract = await new SpokeNttToken__factory(signer).deploy(
            tokenName,
            tokenSymbol,
            minter,
            owner
        );

        await spokeNttTokenContract.waitForDeployment();
        const spokeNttTokenAddress = await spokeNttTokenContract.getAddress();

        // write
        const deployedSpoke = deployedNttContracts.spokes[description];
        deployedSpoke.nttToken = spokeNttTokenAddress;
        console.log(`Deployed SpokeNttToken: ${spokeNttTokenAddress} on spoke chain: ${description}`);
    }
}

export async function deployNttManagers(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
    nttManagersConfig: NttManagerConfig[]
) {
    await deployHubNttManager(chainsToDeploy, chainsConfig, deployedNttContracts, nttManagersConfig);
    await deploySpokeNttManagers(chainsToDeploy, chainsConfig, deployedNttContracts, nttManagersConfig);

    storeDeployedNttContracts(deployedNttContracts);
    console.log("Deployed NttManager contracts");
}

export async function deployHubNttManager(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
    nttManagersConfig: NttManagerConfig[],
) {
    const { hub: hubChainInfo } = chainsConfig;
    const { hub: deployedNttHub } = deployedNttContracts;
    const signer = getWallet(hubChainInfo.folksChainId);

    if (!chainsToDeploy.includes(hubChainInfo.description)) return;

    const hubNttManagerConfig = nttManagersConfig.find((chainConfig) => chainConfig.description === hubChainInfo.description);
    if (!hubNttManagerConfig) return;

    // deploy
    const transceiverStructsContract = await new TransceiverStructs__factory(signer).deploy();
    await transceiverStructsContract.waitForDeployment();
    const transceiverStructsContractAddress = await transceiverStructsContract.getAddress();
    deployedNttContracts.hub.nttTransceiverStructs = transceiverStructsContractAddress;

    const hubNttManagerContract = await new NttManager__factory(
        {
            ["contracts/ntt/libraries/TransceiverStructs.sol:TransceiverStructs"]: transceiverStructsContractAddress
        }, signer
    ).deploy(
        deployedNttHub.nttToken,
        hubNttManagerConfig.mode,
        hubNttManagerConfig.chainId,
        hubNttManagerConfig.rateLimitDuration,
        hubNttManagerConfig.skipRateLimit
    )
    await hubNttManagerContract.waitForDeployment();
    deployedNttContracts.hub.nttManagerImplementation = await hubNttManagerContract.getAddress();
}

export async function deploySpokeNttManagers(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
    nttManagersConfig: NttManagerConfig[]
) {
    for (const chain of chainsToDeploy) {
        const spoke = chainsConfig.spokes.find((spoke) => spoke.description === chain);
        if (!spoke) continue;

        const spokeNttManagerConfig = nttManagersConfig.find((chainConfig) => chainConfig.description === chain);
        if (!spokeNttManagerConfig) continue;

        const { description, folksChainId } = spoke;
        const signer = getWallet(folksChainId);

        const deployedSpokeNttContract = deployedNttContracts.spokes[description];

        // deploy
        const transceiverStructsContract = await new TransceiverStructs__factory(signer).deploy();
        await transceiverStructsContract.waitForDeployment();
        const transceiverStructsContractAddress = await transceiverStructsContract.getAddress();
        deployedSpokeNttContract.nttTransceiverStructs = transceiverStructsContractAddress;

        const spokeNttManagerContract = await new NttManager__factory(
            {
                ["contracts/ntt/libraries/TransceiverStructs.sol:TransceiverStructs"]: transceiverStructsContractAddress
            }, signer
        ).deploy(
            deployedSpokeNttContract.nttToken, // spokeNttManagerConfig.token
            spokeNttManagerConfig.mode,
            spokeNttManagerConfig.chainId,
            spokeNttManagerConfig.rateLimitDuration,
            spokeNttManagerConfig.skipRateLimit
        )
        await spokeNttManagerContract.waitForDeployment();
        deployedSpokeNttContract.nttManagerImplementation = await spokeNttManagerContract.getAddress();
    }
}

export async function deployNttManagersProxy(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {
    await deployHubNttManagerProxy(chainsToDeploy, chainsConfig, deployedNttContracts);
    await deploySpokeNttManagersProxy(chainsToDeploy, chainsConfig, deployedNttContracts);

    storeDeployedNttContracts(deployedNttContracts);
    console.log("Deployed NttManagerProxy contracts");
}

export async function deployHubNttManagerProxy(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
) {
    const { hub: hubChainInfo } = chainsConfig;
    const { hub: deployedNttHub } = deployedNttContracts;
    const signer = getWallet(hubChainInfo.folksChainId);

    if (!chainsToDeploy.includes(hubChainInfo.description)) return;

    // deploy
    const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
    const encodedCall = contractFactory.interface.encodeFunctionData("initialize", []);

    const hubManagerProxyContract = await new ERC1967Proxy__factory(signer).deploy(deployedNttHub.nttManagerImplementation, encodedCall);
    await hubManagerProxyContract.waitForDeployment();

    deployedNttContracts.hub.nttManagerProxy = await hubManagerProxyContract.getAddress();
}

export async function deploySpokeNttManagersProxy(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {
    for (const chain of chainsToDeploy) {
        const spoke = chainsConfig.spokes.find((spoke) => spoke.description === chain);
        if (!spoke) continue;

        const { description, folksChainId } = spoke;
        const signer = getWallet(folksChainId);

        const deployedSpokeNttContract = deployedNttContracts.spokes[description];

        // deploy
        const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
        const encodedCall = contractFactory.interface.encodeFunctionData("initialize", []);

        const spokeNttManagerProxyContract = await new ERC1967Proxy__factory(signer).deploy(deployedSpokeNttContract.nttManagerImplementation, encodedCall);
        await spokeNttManagerProxyContract.waitForDeployment();
        deployedSpokeNttContract.nttManagerImplementation = await spokeNttManagerProxyContract.getAddress();
    }
}

export async function deployNttTransceivers(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
    nttManagersConfig: NttManagerConfig[]
) {
    await deployHubNttTransceiver(chainsToDeploy, chainsConfig, deployedNttContracts);
    await deploySpokeNttTransceivers(chainsToDeploy, chainsConfig, deployedNttContracts);

    storeDeployedNttContracts(deployedNttContracts);
    console.log("Deployed TransceiverImplementation contracts");
}

export async function deployHubNttTransceiver(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {
    const { hub: hubChainInfo } = chainsConfig;
    const signer = getWallet(hubChainInfo.folksChainId);

    if (!chainsToDeploy.includes(hubChainInfo.description)) return;

    // deploy
    const consistencyLevel = 200;
    const gasLimit = 360000;
    const wormholeTransceiverContract = await new WormholeTransceiver__factory(
        {
            ["contracts/ntt/libraries/TransceiverStructs.sol:TransceiverStructs"]: deployedNttContracts.hub.nttTransceiverStructs
        }, signer
    ).deploy(
        deployedNttContracts.hub.nttManagerProxy,
        hubChainInfo.wormhole.wormholeCore,
        hubChainInfo.wormhole.wormholeRelayer,
        hubChainInfo.wormhole.wormholeRelayer, // specializedRelayer
        BigInt(consistencyLevel),
        BigInt(gasLimit),
    );
    await wormholeTransceiverContract.waitForDeployment();
    deployedNttContracts.hub.nttTransceiverImplementation = await wormholeTransceiverContract.getAddress();
}

export async function deploySpokeNttTransceivers(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {

    for (const chain of chainsToDeploy) {
        const spoke = chainsConfig.spokes.find((spoke) => spoke.description === chain);
        if (!spoke) continue;

        const { description, folksChainId } = spoke;
        const signer = getWallet(folksChainId);

        const deployedSpokeNttContract = deployedNttContracts.spokes[description];

        // deploy
        const consistencyLevel = 200; // probably we would need to add this to some config file
        const gasLimit = 360000;
        const wormholeSpokeTransceiverContract = await new WormholeTransceiver__factory(
            {
                ["contracts/ntt/libraries/TransceiverStructs.sol:TransceiverStructs"]: deployedSpokeNttContract.nttTransceiverStructs
            }, signer
        ).deploy(
            deployedSpokeNttContract.nttManagerProxy,
            spoke.wormhole.wormholeRelayer, // core contract
            spoke.wormhole.wormholeRelayer,
            spoke.wormhole.wormholeRelayer, // specializedRelayer
            BigInt(consistencyLevel),
            BigInt(gasLimit),
        );
        await wormholeSpokeTransceiverContract.waitForDeployment();
        deployedSpokeNttContract.nttTransceiverImplementation = await wormholeSpokeTransceiverContract.getAddress();
    }
}

export async function deployNttTransceiversProxy(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {
    await deployHubNttTransceiverProxy(chainsToDeploy, chainsConfig, deployedNttContracts);
    await deploySpokeNttTransceiversProxy(chainsToDeploy, chainsConfig, deployedNttContracts);

    storeDeployedNttContracts(deployedNttContracts);
    console.log("Deployed NttTrancieverProxy contracts");
}

export async function deployHubNttTransceiverProxy(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts,
) {
    const { hub: hubChainInfo } = chainsConfig;
    const { hub: deployedNttHub } = deployedNttContracts;
    const signer = getWallet(hubChainInfo.folksChainId);

    if (!chainsToDeploy.includes(hubChainInfo.description)) return;

    // deploy
    const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
    const encodedCall = contractFactory.interface.encodeFunctionData("initialize", []);

    const hubTrancieverProxyContract = await new ERC1967Proxy__factory(signer).deploy(deployedNttHub.nttTransceiverImplementation, encodedCall);
    await hubTrancieverProxyContract.waitForDeployment();

    deployedNttHub.nttTransceiverProxy = await hubTrancieverProxyContract.getAddress();
}

export async function deploySpokeNttTransceiversProxy(
    chainsToDeploy: string[],
    chainsConfig: Config,
    deployedNttContracts: DeployedNttContracts
) {
    for (const chain of chainsToDeploy) {
        const spoke = chainsConfig.spokes.find((spoke) => spoke.description === chain);
        if (!spoke) continue;

        const { description, folksChainId } = spoke;
        const signer = getWallet(folksChainId);

        const deployedSpokeNttContract = deployedNttContracts.spokes[description];

        // deploy
        const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
        const encodedCall = contractFactory.interface.encodeFunctionData("initialize", []);

        const spokeNttTrancieverProxyContract = await new ERC1967Proxy__factory(signer).deploy(deployedSpokeNttContract.nttTransceiverImplementation, encodedCall);
        await spokeNttTrancieverProxyContract.waitForDeployment();
        deployedSpokeNttContract.nttTransceiverProxy = await spokeNttTrancieverProxyContract.getAddress();
    }
}