import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { SESSION_DURATION_OPTIONS, getSessionFunding } from '../utils/sessionConfig';

interface SessionKey {
  privateKey: string;
  publicKey: string;
  address: string;
  expiresAt: number;
  scope: string[];
}

interface AAState {
  isEnabled: boolean;
  sessionKey: SessionKey | null;
  isCreatingSession: boolean;
  error: string | null;
  sessionProgress: {
    currentStep: number;
    totalSteps: number;
    steps: {
      title: string;
      description: string;
      status: 'pending' | 'active' | 'completed' | 'error';
    }[];
    sessionDuration?: string;
    sessionCost?: string;
  } | null;
}

export const useAccountAbstraction = (
  userAddress: string | null,
  signer: ethers.JsonRpcSigner | null
) => {
  const [state, setState] = useState<AAState>({
    isEnabled: false,
    sessionKey: null,
    isCreatingSession: false,
    error: null,
    sessionProgress: null,
  });

  // Create a session key for account abstraction
  const createSessionKey = useCallback(async (durationMinutes: number = 60): Promise<boolean> => {
    if (!userAddress || !signer) return false;

    // Get session configuration for this duration
    const sessionOption = SESSION_DURATION_OPTIONS.find(opt => opt.minutes === durationMinutes);
    const fundingAmountETH = await getSessionFunding(durationMinutes);

    // Initialize progress tracking
    const steps = [
      {
        title: 'Authorize Session Key',
        description: 'Sign to authorize a temporary key for instant message sending',
        status: 'pending' as const,
      },
      {
        title: 'Setup ZeroSig Messaging',
        description: `Fund session key (${fundingAmountETH} ETH) and enable delegation in one transaction`,
        status: 'pending' as const,
      },
    ];

    setState(prev => ({ 
      ...prev, 
      isCreatingSession: true, 
      error: null,
      sessionProgress: {
        currentStep: 1,
        totalSteps: 2,
        steps: [...steps],
        sessionDuration: sessionOption?.label || `${durationMinutes} minutes`,
        sessionCost: fundingAmountETH,
      }
    }));

    try {
      console.log('Creating session key for HASHD...');
      
      // Generate a new session key (temporary private key)
      const sessionWallet = ethers.Wallet.createRandom();
      const expiresAt = Date.now() + (durationMinutes * 60 * 1000);

      console.log('Session wallet created:', sessionWallet.address);

      // Define what the session key can do - use environment variable
      const messageContractAddress = process.env.REACT_APP_MESSAGE_CONTRACT;
      console.log('DEBUG: Message contract address:', messageContractAddress);
      console.log('DEBUG: All env vars:', {
        REACT_APP_MESSAGE_CONTRACT: process.env.REACT_APP_MESSAGE_CONTRACT,
        REACT_APP_RPC_URL: process.env.REACT_APP_RPC_URL,
        NODE_ENV: process.env.NODE_ENV
      });
      
      if (!messageContractAddress) {
        throw new Error('MESSAGE_CONTRACT address not configured in environment variables');
      }

      // Create the session authorization message
      const domain = {
        name: 'HASHD Session',
        version: '1',
        chainId: 6342, // MegaETH chain ID
        verifyingContract: messageContractAddress,
      };

      const types = {
        SessionAuthorization: [
          { name: 'sessionKey', type: 'address' },
          { name: 'validUntil', type: 'uint256' },
          { name: 'allowedContracts', type: 'address[]' },
          { name: 'allowedMethods', type: 'bytes4[]' },
        ],
      };

      const allowedContracts = [messageContractAddress];

      // Method selectors for allowed functions
      const sendMessageSelector = ethers.id('sendMessage(address,bytes,bytes)').slice(0, 10);
      const sendMessageForSelector = ethers.id('sendMessageFor(address,address,bytes,bytes)').slice(0, 10);
      const markAsReadSelector = ethers.id('markAsRead(uint256)').slice(0, 10);
      const archiveMessageSelector = ethers.id('archiveMessage(uint256)').slice(0, 10);
      
      const allowedMethods = [
        sendMessageSelector,
        sendMessageForSelector,
        markAsReadSelector,
        archiveMessageSelector
      ];

      const value = {
        sessionKey: sessionWallet.address,
        validUntil: Math.floor(expiresAt / 1000),
        allowedContracts,
        allowedMethods,
      };

      // Step 1: Session Authorization
      const updatedSteps1 = steps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'active' as const : step.status
      }));
      setState(prev => ({ 
        ...prev, 
        sessionProgress: prev.sessionProgress ? {
          ...prev.sessionProgress,
          steps: updatedSteps1
        } : null
      }));

      console.log('Requesting session authorization signature...');
      console.log('DEBUG: Signer info:', {
        signerAddress: await signer.getAddress(),
        hasProvider: !!signer.provider,
        providerNetwork: signer.provider ? await signer.provider.getNetwork() : null
      });
      
      // Ensure signer has a provider for ENS resolution
      if (!signer.provider) {
        throw new Error('Signer does not have a provider attached');
      }
      
      console.log('DEBUG: About to sign typed data with domain:', domain);
      console.log('DEBUG: Types:', types);
      console.log('DEBUG: Value:', value);
      
      // Sign the session authorization with the main wallet
      const signature = await signer.signTypedData(domain, types, value);
      
      const updatedSteps2 = updatedSteps1.map((step, index) => ({
        ...step,
        status: index === 0 ? 'completed' as const : index === 1 ? 'active' as const : step.status
      }));
      setState(prev => ({ 
        ...prev, 
        sessionProgress: prev.sessionProgress ? {
          ...prev.sessionProgress,
          currentStep: 2,
          steps: updatedSteps2
        } : null
      }));

      console.log('Session authorized, setting up ZeroSig messaging...');

      // Step 2: Combined funding and delegation authorization
      const fundingAmount = ethers.parseEther(fundingAmountETH);
      
      console.log(`Setting up ZeroSig messaging: funding ${fundingAmountETH} ETH and authorizing delegate...`);
      console.log('DEBUG: Contract address for delegation:', messageContractAddress);

      // Use the authorizeDelegateAndFund function for a single transaction
      console.log('Executing combined authorization and funding transaction...');
      
      const combinedInterface = new ethers.Interface([
        'function authorizeDelegateAndFund(address _delegate, uint256 _validUntil) external payable'
      ]);
      
      const combinedTx = await signer.sendTransaction({
        to: messageContractAddress,
        value: fundingAmount, // This funds the session key
        data: combinedInterface.encodeFunctionData('authorizeDelegateAndFund', [
          sessionWallet.address, // Session key as delegate
          Math.floor(Date.now() / 1000) + (durationMinutes * 60) // Valid until
        ]),
      });

      console.log('Combined transaction sent:', combinedTx.hash);
      console.log('Waiting for confirmation...');

      // Wait for the single transaction
      await combinedTx.wait();
      
      console.log('Setup complete with single transaction!');

      const updatedSteps3 = updatedSteps2.map((step, index) => ({
        ...step,
        status: index === 1 ? 'completed' as const : step.status
      }));
      setState(prev => ({ 
        ...prev, 
        sessionProgress: prev.sessionProgress ? {
          ...prev.sessionProgress,
          currentStep: 2,
          steps: updatedSteps3
        } : null
      }));

      const sessionKey: SessionKey = {
        privateKey: sessionWallet.privateKey,
        publicKey: sessionWallet.publicKey,
        address: sessionWallet.address,
        expiresAt,
        scope: ['sendMessage', 'sendMessageFor', 'markAsRead', 'archiveMessage'],
      };

      // Store session key and authorization
      const sessionData = {
        sessionKey,
        authorization: {
          signature,
          domain,
          types,
          value,
        },
        fundingTxHash: combinedTx.hash,
      };

      localStorage.setItem(`hashd_session_${userAddress}`, JSON.stringify(sessionData));

      console.log('Session key created successfully!');

      setState(prev => ({
        ...prev,
        isEnabled: true,
        sessionKey,
        isCreatingSession: false,
        sessionProgress: null, // Clear progress when done
      }));

      return true;
    } catch (error: any) {
      console.error('Session creation failed:', error);
      
      // Mark current step as error
      const currentStepIndex = (state.sessionProgress?.currentStep || 1) - 1;
      const errorSteps = steps.map((step, index) => ({
        ...step,
        status: index === currentStepIndex ? 'error' as const : step.status
      }));
      
      setState(prev => ({
        ...prev,
        isCreatingSession: false,
        error: error.message || 'Failed to create session key',
        sessionProgress: prev.sessionProgress ? {
          ...prev.sessionProgress,
          steps: errorSteps
        } : null
      }));
      return false;
    }
  }, [userAddress, signer, state.sessionProgress?.currentStep]);

  // Send a message using the funded session key (no user signature required)
  const sendMessageWithSessionKey = useCallback(async (
    recipient: string,
    encryptedContent: Uint8Array,
    encryptedMetadata: Uint8Array,
    senderEncryptedContent: Uint8Array,
    senderEncryptedMetadata: Uint8Array
  ): Promise<string | null> => {
    if (!userAddress || !state.sessionKey || !state.isEnabled) return null;

    // Check if session is still valid
    if (Date.now() > state.sessionKey.expiresAt) {
      setState(prev => ({ ...prev, error: 'Session expired. Please create a new session.' }));
      return null;
    }

    try {
      console.log('Sending message with session key...');
      
      // Create a wallet from the funded session key
      const sessionWallet = new ethers.Wallet(state.sessionKey.privateKey);
      console.log('Session wallet address:', sessionWallet.address);

      // Check session balance before proceeding
      const hasBalance = await checkSessionBalance();
      if (!hasBalance) {
        throw new Error('Session wallet ran out of funds. Please create a new session.');
      }

      // Get provider for transaction operations
      if (!window.ethereum) {
        throw new Error('No ethereum provider found');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);

      const contractAddress = process.env.REACT_APP_MESSAGE_CONTRACT || '';
      console.log('DEBUG: sendMessageWithSessionKey contract address:', contractAddress);
      
      if (!contractAddress) {
        throw new Error('Message contract address not configured');
      }
      
      // Create the transaction data using sendMessageFor (delegation)
      const contractInterface = new ethers.Interface([
        'function sendMessageFor(address _user, address _recipient, bytes _encryptedContent, bytes _encryptedMetadata, bytes _senderEncryptedContent, bytes _senderEncryptedMetadata) external returns (uint256)'
      ]);
      
      const data = contractInterface.encodeFunctionData('sendMessageFor', [
        userAddress,
        recipient,
        encryptedContent,
        encryptedMetadata,
        senderEncryptedContent,
        senderEncryptedMetadata
      ]);
      console.log('Transaction data created');

      // Get nonce for the session key address
      const nonce = await provider.getTransactionCount(sessionWallet.address, 'pending');
      console.log('Session key nonce:', nonce);
      
      // Get gas parameters
      const feeData = await provider.getFeeData();
      console.log('Fee data:', {
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
      });

      // Estimate gas for this specific transaction
      let gasLimit;
      try {
        gasLimit = await provider.estimateGas({
          to: contractAddress,
          data,
          from: sessionWallet.address,
        });
        console.log('Estimated gas:', gasLimit.toString());
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);
        // Fallback to a reasonable gas limit
        gasLimit = BigInt('300000');
      }

      // Create transaction with proper gas fee calculation
      const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('0.1', 'gwei');
      
      // Ensure priority fee is not higher than max fee
      const adjustedPriorityFee = maxPriorityFeePerGas > maxFeePerGas ? maxFeePerGas : maxPriorityFeePerGas;
      
      const transaction = {
        to: contractAddress,
        data,
        value: '0x0',
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas: adjustedPriorityFee,
        nonce,
        type: 2,
        chainId: 6342,
      };

      console.log('Transaction object:', transaction);

      // Sign with session key (no user interaction)
      const signedTx = await sessionWallet.signTransaction(transaction);
      console.log('Transaction signed');

      // Submit via RPC
      console.log('Submitting transaction via RPC...');
      const response = await provider.send('eth_sendRawTransaction', [signedTx]);
      console.log('Transaction submitted successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Session key message sending failed:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to send message with session key',
      }));
      throw error;
    }
  }, [userAddress, state.sessionKey, state.isEnabled]);

  // Load existing session key
  const loadSessionKey = useCallback(() => {
    if (!userAddress) return;

    const stored = localStorage.getItem(`hashd_session_${userAddress}`);
    if (stored) {
      try {
        const sessionData = JSON.parse(stored);
        const sessionKey = sessionData.sessionKey;
        
        // Check if session is still valid
        if (Date.now() < sessionKey.expiresAt) {
          setState(prev => ({
            ...prev,
            isEnabled: true,
            sessionKey,
          }));
        } else {
          // Session expired, remove it
          localStorage.removeItem(`hashd_session_${userAddress}`);
        }
      } catch (error) {
        console.error('Error loading session key:', error);
        localStorage.removeItem(`hashd_session_${userAddress}`);
      }
    }
  }, [userAddress]);

  // Clear session key
  const clearSessionKey = useCallback(() => {
    if (userAddress) {
      localStorage.removeItem(`hashd_session_${userAddress}`);
    }
    setState({
      isEnabled: false,
      sessionKey: null,
      isCreatingSession: false,
      error: null,
      sessionProgress: null,
    });
  }, [userAddress]);

  // Get session info
  const getSessionInfo = useCallback(() => {
    if (!state.sessionKey) return null;

    const remainingTime = Math.max(0, state.sessionKey.expiresAt - Date.now());
    const remainingMinutes = Math.floor(remainingTime / (60 * 1000));

    return {
      address: state.sessionKey.address,
      expiresAt: state.sessionKey.expiresAt,
      remainingMinutes,
      isExpired: remainingTime <= 0,
    };
  }, [state.sessionKey]);

  // Clear session progress (for closing modal)
  const clearSessionProgress = useCallback(() => {
    setState(prev => ({ ...prev, sessionProgress: null }));
  }, []);

  // Check session wallet balance and end session if empty
  const checkSessionBalance = useCallback(async (): Promise<boolean> => {
    if (!state.sessionKey) return false;

    try {
      if (!window.ethereum) {
        throw new Error('No ethereum provider found');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(state.sessionKey.address);
      const balanceETH = parseFloat(ethers.formatEther(balance));
      
      // If balance is very low (less than cost of 1 transaction), end session
      const minBalance = 0.000001; // ~1 transaction worth
      
      if (balanceETH < minBalance) {
        console.log('Session wallet balance too low, ending session:', balanceETH, 'ETH');
        setState(prev => ({ 
          ...prev, 
          isEnabled: false, 
          sessionKey: null,
          error: 'Session wallet ran out of funds. Please create a new session.'
        }));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking session balance:', error);
      return false;
    }
  }, [state.sessionKey]);

  return {
    ...state,
    createSessionKey,
    sendMessageWithSessionKey,
    loadSessionKey,
    clearSessionKey,
    clearSessionProgress,
    checkSessionBalance,
    getSessionInfo,
  };
};
