'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from '@/components/ui/use-toast';

// Get contract address based on current chain
const getContractAddress = (chainId: number): `0x${string}` => {
  const addresses = {
    137: process.env.NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS, // Polygon
    80001: process.env.NEXT_PUBLIC_POLYGON_MUMBAI_CONTRACT_ADDRESS, // Mumbai
    8453: process.env.NEXT_PUBLIC_BASE_CONTRACT_ADDRESS, // Base
    84532: process.env.NEXT_PUBLIC_BASE_SEPOLIA_CONTRACT_ADDRESS, // Base Sepolia
    11155111: process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS, // Sepolia
  };
  
  const address = addresses[chainId as keyof typeof addresses];
  if (!address || address === 'your_contract_address_here') {
    console.warn(`No contract address configured for chain ID ${chainId}`);
    return '0x0000000000000000000000000000000000000000' as `0x${string}`;
  }
  return address as `0x${string}`;
};

// Simplified ABI for minting
const OWNERSHIP_NFT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: 'contentHash', type: 'string' },
      { internalType: 'string', name: 'simHash', type: 'string' },
      { internalType: 'string', name: 'contentType', type: 'string' },
      { internalType: 'string', name: 'contentPreview', type: 'string' },
      { internalType: 'string', name: 'authorHandle', type: 'string' },
      { internalType: 'string[]', name: 'tags', type: 'string[]' },
      { internalType: 'string', name: 'metadataURI', type: 'string' }
    ],
    name: 'mintCertificate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'string', name: 'contentHash', type: 'string' }],
    name: 'isContentCertified',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

interface MintParams {
  contentHash: string;
  simHash?: string;
  contentType: string;
  contentPreview: string;
  authorHandle?: string;
  tags?: string[];
  metadataURI: string;
}

interface UseMintOwnershipNFTReturn {
  mint: (params: MintParams) => void;
  isMinting: boolean;
  txSuccess: boolean;
  txError: Error | null;
  txHash?: string;
  tokenId?: bigint;
  reset: () => void;
  isSupported: boolean;
  contractAddress?: string;
}

export function useMintOwnershipNFT(): UseMintOwnershipNFTReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const [txSuccess, setTxSuccess] = useState(false);
  const [txError, setTxError] = useState<Error | null>(null);
  const [tokenId, setTokenId] = useState<bigint>();

  // Get contract address for current chain
  const contractAddress = getContractAddress(chainId); 
  const isSupported = Boolean(contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000');

  // Contract write hook
  const {
    data: writeData,
    writeContract,
    error: writeError,
    isPending: isWriteLoading,
    reset: resetWrite
  } = useWriteContract();

  // Wait for transaction confirmation
  const {
    data: txData,
    isLoading: isTxLoading,
    error: txWaitError
  } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Combined loading state
  const isMinting = isWriteLoading || isTxLoading;

  // Handle transaction completion
  useEffect(() => {
    if (txData) {
      setTxSuccess(true);
      setTxError(null);
      
      // Try to extract token ID from logs
      try {
        const mintEvent = txData.logs.find(log => 
          log.topics[0] === '0x...' // CertificateMinted event signature
        );
        if (mintEvent && mintEvent.topics[3]) {
          setTokenId(BigInt(mintEvent.topics[3]));
        }
      } catch (e) {
        console.warn('Could not extract token ID from transaction logs');
      }

      toast({
        title: '🎉 NFT Minted Successfully!',
        description: `Your ownership certificate has been minted on blockchain`,
      });
    }
  }, [txData]);

  // Handle errors
  useEffect(() => {
    const error = writeError || txWaitError;
    if (error) {
      setTxError(error);
      setTxSuccess(false);
      
      toast({
        title: '❌ Minting Failed',
        description: error.message || 'Failed to mint ownership certificate',
        variant: 'destructive',
      });
    }
  }, [writeError, txWaitError]);

  // Mint function
  const mint = (params: MintParams) => {
    if (!address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to mint an NFT',
        variant: 'destructive',
      });
      return;
    }

    if (!isSupported) {
      toast({
        title: 'Unsupported Network',
        description: `Minting is not available on this network`,
        variant: 'destructive',
      });
      return;
    }

    // Reset previous state
    setTxSuccess(false);
    setTxError(null);
    setTokenId(undefined);

    // Call contract write
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: OWNERSHIP_NFT_ABI,
      functionName: 'mintCertificate',
      args: [
        address,
        params.contentHash,
        params.simHash || '',
        params.contentType,
        params.contentPreview.slice(0, 100), // Limit preview length
        params.authorHandle || '',
        params.tags || [],
        params.metadataURI
      ]
    });
  };

  // Reset function
  const reset = () => {
    setTxSuccess(false);
    setTxError(null);
    setTokenId(undefined);
    resetWrite();
  };

  return {
    mint,
    isMinting,
    txSuccess,
    txError,
    txHash: writeData,
    tokenId,
    reset,
    isSupported,
    contractAddress
  };
}
