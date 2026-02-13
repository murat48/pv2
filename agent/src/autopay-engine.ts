import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';

/**
 * AutoPay Engine - Automatic payment processing for x402 requests
 */
export class AutoPayEngine {
  private account: any;
  private client: any;
  private apiUrl: string;
  private network: 'mainnet' | 'testnet';

  constructor(privateKey: string, apiUrl: string, network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network;
    this.apiUrl = apiUrl;
    this.account = privateKeyToAccount(privateKey, network);
    
    const baseAxios = axios.create({
      baseURL: apiUrl,
      timeout: 60000,
    });

    this.client = wrapAxiosWithPayment(baseAxios, this.account);
  }

  /**
   * Process a single request with automatic payment
   */
  async processRequest(endpoint: string, data: any) {
    try {
      console.log(`🤖 Processing request to ${endpoint}`);
      
      const response = await this.client.post(endpoint, data);
      
      console.log(`✅ Request successful`);
      console.log(`📊 Response:`, response.data);
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        console.log(`💳 Payment required (402 Payment Required)`);
        console.log(`📋 Details:`, error.response.data);
        
        // Retry with automatic payment signature
        try {
          const response = await this.client.post(endpoint, data);
          console.log(`✅ Payment processed successfully`);
          return response.data;
        } catch (retryError: any) {
          console.error(`❌ Payment retry failed:`, retryError.message);
          throw retryError;
        }
      }
      
      console.error(`❌ Request failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get account information
   */
  getAccount() {
    return this.account;
  }

  /**
   * Get client instance
   */
  getClient() {
    return this.client;
  }
}

export default AutoPayEngine;
