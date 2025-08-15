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
import { http } from 'wagmi';

// Validate WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId || projectId === 'your-project-id') {
  console.error('❌ WalletConnect Project ID is missing or invalid!');
  console.log('Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file');
}

// Define chains with proper configuration
const chains = [
  mainnet,
  polygon,
  base,
  ...(process.env.NODE_ENV === 'development' ? [sepolia, baseSepolia, polygonMumbai] : []),
] as const;

// Wallet configuration for The Ownership Layer
export const walletConfig = getDefaultConfig({
  appName: 'The Ownership Layer',
  projectId: projectId!,
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [polygonMumbai.id]: http(),
  },
  ssr: true,
});

console.log('✅ Wallet config initialized with Project ID:', projectId?.slice(0, 8) + '...');

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
