/**
 * Environment configuration with fallbacks
 * Prevents crashes when environment variables are not set
 */

export const env = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    isConfigured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')
    )
  },
  
  // Blockchain Configuration
  blockchain: {
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'), // Base mainnet
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'placeholder-project-id',
    isConfigured: !!(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS &&
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    )
  },
  
  // App Configuration
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'The Ownership Layer',
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Content fingerprinting and ownership verification platform'
  },
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

// Helper function to check if all required environment variables are set
export function checkEnvironmentConfig() {
  const warnings: string[] = [];
  
  if (!env.supabase.isConfigured) {
    warnings.push('Supabase configuration missing. Authentication features will not work.');
  }
  
  if (!env.blockchain.isConfigured) {
    warnings.push('Blockchain configuration missing. Web3 features will not work.');
  }
  
  if (warnings.length > 0 && env.isDevelopment) {
    console.warn('⚠️ Environment Configuration Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('  Check your .env.local file and update the configuration.');
  }
  
  return warnings.length === 0;
}

// Run environment check on import in development
if (env.isDevelopment && typeof window !== 'undefined') {
  checkEnvironmentConfig();
}
