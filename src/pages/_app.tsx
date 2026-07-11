import '../styles/globals.css';
import type { AppProps } from 'next/app';
import MainLayout from './mainLayout';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { WalletProvider } from '@wkrjwlt/walletkit';

import { config } from '../wagmi';
import WalletErrorHandler from '../components/WalletErrorHandler';

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <WalletProvider>
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
