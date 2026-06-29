import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';

// 1. 环境变量校验，避免id失效静默失败
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
if (!WC_PROJECT_ID) throw new Error("缺少 NEXT_PUBLIC_WC_PROJECT_ID 环境变量");

// 2. 兼容.env开关判断
const enableTestnets = process.env.NEXT_PUBLIC_ENABLE_TESTNETS?.toLowerCase() === 'true';
const extraChains = enableTestnets ? [sepolia] : [];

export const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: WC_PROJECT_ID,
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    ...extraChains,
  ],
  transports: {
    [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi'),
    [polygon.id]: http('https://polygon-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi'),
    [optimism.id]: http('https://opt-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi'),
    [arbitrum.id]: http('https://arb-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi'),
    [base.id]: http('https://base-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi'),
    // 注意：Alchemy Sepolia 需要单独创建测试网API密钥，不要复用主网key
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  ssr: true,
});
