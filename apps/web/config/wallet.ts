import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  baseSepolia,
  polygonMumbai,
} from 'wagmi/chains';

// Wallet configuration for The Ownership Layer
export const walletConfig = getDefaultConfig({
  appName: 'The Ownership Layer',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    ...(process.env.NODE_ENV === 'development' ? [sepolia, baseSepolia, polygonMumbai] : []),
  ],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

// Chain configuration for different environments
export const SUPPORTED_CHAINS = {
  mainnet: {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://eth-mainnet.g.alchemy.com/v2/'] },
      public: { http: ['https://eth-mainnet.g.alchemy.com/v2/'] },
    },
  },
  base: {
    id: 8453,
    name: 'Base',
    network: 'base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://mainnet.base.org'] },
      public: { http: ['https://mainnet.base.org'] },
    },
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    network: 'matic',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://polygon-rpc.com'] },
      public: { http: ['https://polygon-rpc.com'] },
    },
  },
};

// ENS-style handle configuration
export const HANDLE_CONFIG = {
  suffix: '.own',
  minLength: 3,
  maxLength: 20,
  reservedNames: ['admin', 'api', 'www', 'app', 'support', 'help', 'about'],
  validationRegex: /^[a-z0-9-]+$/,
};

// Default profile configuration
export const DEFAULT_PROFILE = {
  bio: '',
  avatar: '',
  socials: {
    twitter: '',
    github: '',
    website: '',
    discord: '',
  },
  contentTypes: ['text', 'image', 'audio', 'code'],
  isVerified: false,
  reputation: 0,
};
