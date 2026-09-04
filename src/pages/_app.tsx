import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useState } from 'react';
import MainLayout from './mainLayout';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { WalletProvider } from '@wkrjwlt/walletkit';

import { config } from '../wagmi';
import WalletErrorHandler from '../components/WalletErrorHandler';

// 自定义钱包配置
const walletConfig = {
  appName: 'MetaNode Stake',
  // 各链的 RPC URL（用于 WLT 钱包在不同链上查询余额）
  rpcUrls: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi',
    137: 'https://polygon-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi',
    10: 'https://opt-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi',
    42161: 'https://arb-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi',
    8453: 'https://base-mainnet.g.alchemy.com/v2/qKdp3vS81JSH_Z43Q9dXi',
    11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  },
  wallets: [
    // 添加 WLT 自定义钱包
    {
      id: 'wlt',
      name: 'WLT Wallet',
      description: 'WLT 自定义钱包',
      enabled: true,
      visible: true,
    },
  ],
};

function MyApp({ Component, pageProps }: AppProps) {
  // QueryClient 必须在组件内部创建，避免 SSR 时的共享状态问题
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider config={walletConfig}>
          <WalletErrorHandler>
            <MainLayout>
              <Component {...pageProps} />
            </MainLayout>
          </WalletErrorHandler>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
