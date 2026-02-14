import axios from 'axios';
import { Buffer } from 'buffer';
import {
  wrapAxiosWithPayment,
  privateKeyToAccount,
} from 'x402-stacks';
import { AppConfig, UserSession, authenticate } from '@stacks/connect';

// Setup Buffer global for x402-stacks (browser compatibility)
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  
  // Suppress wallet provider redefinition errors
  // These are harmless console warnings from wallet libraries conflicting
  const originalDefine = Object.defineProperty;
  const originalDefineProperties = Object.defineProperties;
  
  Object.defineProperty = function(obj: any, prop: string, descriptor: any) {
    try {
      return originalDefine.call(this, obj, prop, descriptor);
    } catch (e: any) {
      if (prop === 'ethereum' || prop === 'StacksProvider' || prop === 'StacksNetwork') {
        console.debug(`ℹ️ Wallet provider already defined (${prop}), skipping redefinition`);
        return obj;
      }
      throw e;
    }
  };
  
  Object.defineProperties = function(obj: any, props: any) {
    try {
      return originalDefineProperties.call(this, obj, props);
    } catch (e: any) {
      console.debug(`ℹ️ Some wallet providers already defined, skipping conflicting redefinitions`);
      return obj;
    }
  };
  
  // Override fetch to proxy Hiro API calls through backend
  const originalFetch = window.fetch;
  window.fetch = async (resource: any, config?: any) => {
    let url = '';
    
    if (typeof resource === 'string') {
      url = resource;
    } else if (resource instanceof Request) {
      url = resource.url;
    } else if (resource && typeof resource === 'object' && 'url' in resource) {
      url = resource.url;
    }
    
    // Proxy Hiro API calls through backend
    if (typeof url === 'string' && url.includes('api.testnet.hiro.so')) {
      const path = url.replace('https://api.testnet.hiro.so/', '');
      const proxyUrl = `http://localhost:3003/proxy/hiro/${path}`;
      console.log(`🔄 Proxying Hiro request: ${path}`);
      
      return originalFetch(proxyUrl, config);
    }
    
    // Default fetch for other URLs
    return originalFetch(resource, config);
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:3003/api');
const NETWORK = (import.meta.env.VITE_NETWORK as 'mainnet' | 'testnet') || 'testnet';

// Stacks Connect configuration
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Wallet key from environment
const WALLET_PRIVATE_KEY = import.meta.env.VITE_CLIENT_PRIVATE_KEY;

// Global account state
let currentAccount: any = null;

/**
 * Connect to Leather wallet
 */
export function connectLeatherWallet(): Promise<{ address: string; publicKey: string }> {
  return new Promise((resolve, reject) => {
    authenticate({
      appDetails: {
        name: 'x402 Vision AI',
        icon: window.location.origin + '/favicon.ico',
      },
      redirectTo: '/',
      onFinish: (payload: any) => {
        const userData = payload.userSession.loadUserData();
        const address = userData.profile.stxAddress[NETWORK];
        const publicKey = userData.profile.stxPublicKey || '';
        
        // Store in localStorage
        localStorage.setItem('leather_connected', 'true');
        localStorage.setItem('leather_address', address);
        localStorage.setItem('leather_publicKey', publicKey);
        // Clear the disconnected flag when connecting
        localStorage.removeItem('wallet_disconnected');
        
        // Reset payment client state so it will be recreated fresh
        currentAccount = null;
        
        console.log('🔗 Leather wallet connected:', address);
        
        resolve({ address, publicKey });
      },
      onCancel: () => {
        reject(new Error('User cancelled wallet connection'));
      },
      userSession,
    });
  });
}

/**
 * Disconnect wallet
 */
export function disconnectWallet() {
  userSession.signUserOut();
  localStorage.removeItem('leather_connected');
  localStorage.removeItem('leather_address');
  localStorage.removeItem('leather_publicKey');
  localStorage.removeItem('x402_wallet_private_key');
  localStorage.removeItem('x402_wallet_address');
  localStorage.setItem('wallet_disconnected', 'true');
  currentAccount = null;
  console.log('👋 Wallet disconnected');
}

/**
 * Check if Leather wallet is connected
 */
export function isLeatherConnected(): boolean {
  return userSession.isUserSignedIn() || localStorage.getItem('leather_connected') === 'true';
}

/**
 * Get Leather wallet address
 */
export function getLeatherAddress(): string | null {
  if (userSession.isUserSignedIn()) {
    const userData = userSession.loadUserData();
    return userData.profile.stxAddress[NETWORK];
  }
  return localStorage.getItem('leather_address');
}

/**
 * Initialize or load wallet account
 * Priority: Leather wallet > Environment key > No wallet (user must connect)
 */
export function initializeWallet() {
  // Check if user explicitly disconnected (don't auto-reconnect)
  if (localStorage.getItem('wallet_disconnected') === 'true') {
    console.log('⚠️ Wallet disconnected by user. Waiting for manual reconnection.');
    currentAccount = null;
    return null;
  }

  // Check if Leather is connected
  if (isLeatherConnected()) {
    const address = getLeatherAddress();
    console.log('🔑 Using Leather wallet:', address);
    
    // For x402-stacks, we need to create an account object
    // Since Leather will sign transactions, we create a compatible account
    currentAccount = {
      address: address!,
      publicKey: localStorage.getItem('leather_publicKey') || '',
      network: NETWORK,
      type: 'leather',
    };
    
    return currentAccount;
  }

  // Fallback to environment wallet (for testing only)
  if (WALLET_PRIVATE_KEY) {
    console.log('🔑 Loading wallet from environment');
    currentAccount = privateKeyToAccount(WALLET_PRIVATE_KEY, NETWORK);
    return currentAccount;
  }

  // No wallet - user must connect Leather
  console.log('⚠️ No wallet connected. Please connect Leather wallet.');
  currentAccount = null;
  return null;
}

/**
 * Get wallet info for display
 */
export function getWalletInfo() {
  // Check Leather first
  if (isLeatherConnected()) {
    const address = getLeatherAddress();
    return {
      address,
      type: 'leather',
      hasWallet: true,
      isLeather: true,
    };
  }

  // Check environment wallet
  if (WALLET_PRIVATE_KEY) {
    const account = privateKeyToAccount(WALLET_PRIVATE_KEY, NETWORK);
    return {
      address: account.address,
      type: 'environment',
      hasWallet: true,
      isLeather: false,
    };
  }

  // No wallet connected
  return {
    address: null,
    type: 'none',
    hasWallet: false,
    isLeather: false,
  };
}

/**
 * Get or create payment client
 * Note: Uses environment private key for signing. Leather is for wallet connection/identification only.
 */
export function getPaymentClient() {
  // Check if user explicitly disconnected
  if (localStorage.getItem('wallet_disconnected') === 'true') {
    console.warn('⚠️ Wallet was disconnected. No payment client available.');
    return null;
  }

  // Use environment private key for payment signing (required for x402-stacks)
  if (WALLET_PRIVATE_KEY) {
    console.log('💰 Using environment wallet for payments');
    const account = privateKeyToAccount(WALLET_PRIVATE_KEY, NETWORK);

    const baseAxios = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return wrapAxiosWithPayment(baseAxios, account);
  }

  // No payment wallet available
  console.warn('⚠️ No private key configured. Payment client not available.');
  return null;
}

// Initialize account on load (may be null if no wallet)
const account = initializeWallet();

if (account) {
  console.log('✅ Initial account initialized');
  if (isLeatherConnected()) {
    console.log('🔗 Using Leather wallet:', getLeatherAddress());
  } else {
    console.log('💰 Using environment wallet:', account.address);
  }
} else if (WALLET_PRIVATE_KEY) {
  // Environment key is available but account not initialized yet
  console.log('💰 Environment wallet available - will initialize on first use');
} else {
  console.log('⚠️ No wallet configured. Please connect Leather wallet.');
}

// Export functions and session
export { account, userSession };
