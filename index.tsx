import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { Buffer } from 'buffer';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID?.trim();
const privyClientId = import.meta.env.VITE_PRIVY_CLIENT_ID?.trim();
const privyProviderProps = privyClientId
  ? {
      appId: privyAppId,
      clientId: privyClientId
    }
  : {
      appId: privyAppId
    };

root.render(
  <React.StrictMode>
    {privyAppId ? (
      <PrivyProvider
        {...privyProviderProps}
        config={{
          solana: {
            rpcs: {
              'solana:devnet': {
                rpc: createSolanaRpc('https://api.devnet.solana.com'),
                rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com')
              }
            }
          },
          embeddedWallets: {
            solana: {
              createOnLogin: 'users-without-wallets'
            }
          }
        }}
      >
        <AppProvider>
          <App />
        </AppProvider>
      </PrivyProvider>
    ) : (
      <div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
        Missing `VITE_PRIVY_APP_ID` in root `.env`.
      </div>
    )}
  </React.StrictMode>
);
