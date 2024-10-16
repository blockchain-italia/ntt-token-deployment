import {
  FolksCore,
  FolksCoreConfig,
  NetworkType,
  MAINNET_FOLKS_TOKEN_ID,
  FolksTokenId,
  LoanTypeId,
  PoolInfo,
  FolksPool,
  FolksLoan,
} from "@folks-finance/xchain-sdk";

async function main() {
  const folksConfig: FolksCoreConfig = {
    network: NetworkType.MAINNET,
    provider: { evm: {} },
  };

  FolksCore.init(folksConfig);
  FolksCore.setNetwork(NetworkType.MAINNET);

  const poolsInfo: Partial<Record<FolksTokenId, PoolInfo>> = {};
  await Promise.all(
    Object.values(MAINNET_FOLKS_TOKEN_ID).map(async (folksTokenId) => {
      const poolInfo = await FolksPool.read.poolInfo(folksTokenId);
      poolsInfo[folksTokenId] = poolInfo;
    })
  );
  const depositLoanTypeInfo = await FolksLoan.read.loanTypeInfo(LoanTypeId.DEPOSIT);
  const generalLoanTypeInfo = await FolksLoan.read.loanTypeInfo(LoanTypeId.GENERAL);

  // console.log("depositLoanTypeInfo", depositLoanTypeInfo);
  // console.log("generalLoanTypeInfo", generalLoanTypeInfo);

  console.log("USDC depositLoanTypeInfo", depositLoanTypeInfo.pools.USDC?.collateralFactor);
  console.log("USDC generalLoanTypeInfo", generalLoanTypeInfo.pools.USDC?.collateralFactor);
  console.log("AVAX depositLoanTypeInfo", depositLoanTypeInfo.pools.AVAX?.collateralFactor);
  console.log("AVAX generalLoanTypeInfo", generalLoanTypeInfo.pools.AVAX?.collateralFactor);
  console.log("sAVAX depositLoanTypeInfo", depositLoanTypeInfo.pools.sAVAX?.collateralFactor);
  console.log("sAVAX generalLoanTypeInfo", generalLoanTypeInfo.pools.sAVAX?.collateralFactor);
  console.log("ETH_eth depositLoanTypeInfo", depositLoanTypeInfo.pools.ETH_eth?.collateralFactor);
  console.log("ETH_eth generalLoanTypeInfo", generalLoanTypeInfo.pools.ETH_eth?.collateralFactor);
  console.log("ETH_base depositLoanTypeInfo", depositLoanTypeInfo.pools.ETH_base?.collateralFactor);
  console.log("ETH_base generalLoanTypeInfo", generalLoanTypeInfo.pools.ETH_base?.collateralFactor);
  console.log("wETH_ava depositLoanTypeInfo", depositLoanTypeInfo.pools.wETH_ava?.collateralFactor);
  console.log("wETH_ava generalLoanTypeInfo", generalLoanTypeInfo.pools.wETH_ava?.collateralFactor);
  console.log("wBTC_eth depositLoanTypeInfo", depositLoanTypeInfo.pools.wBTC_eth?.collateralFactor);
  console.log("wBTC_eth generalLoanTypeInfo", generalLoanTypeInfo.pools.wBTC_eth?.collateralFactor);
  console.log("BTCb_ava depositLoanTypeInfo", depositLoanTypeInfo.pools.BTCb_ava?.collateralFactor);
  console.log("BTCb_ava generalLoanTypeInfo", generalLoanTypeInfo.pools.BTCb_ava?.collateralFactor);
}

main().catch(console.error);
