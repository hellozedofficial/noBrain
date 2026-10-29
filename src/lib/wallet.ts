import 'server-only';
import { query, execute } from '@/lib/db';

export interface UserWallet {
  id: number;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  walletId: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  referenceId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PricingConfig {
  inputPerMillionPrice: number;
  outputPerMillionPrice: number;
  minimumRechargeAmount: number;
  prepaidOnly: boolean;
}

export class WalletService {
  async initializeWalletTables() {
    // Create wallets table if not exists
    await execute(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(100) NOT NULL UNIQUE,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table if not exists
    await execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        walletId INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type ENUM('credit', 'debit') NOT NULL,
        description VARCHAR(255) NOT NULL,
        referenceId VARCHAR(100) NOT NULL UNIQUE,
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        metadata JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE CASCADE
      )
    `);
  }

  async getWallet(userId: string | number): Promise<UserWallet | null> {
    const wallets = await query<UserWallet>(
      'SELECT * FROM wallets WHERE userId = ?',
      [String(userId)]
    );
    return wallets[0] || null;
  }

  async createWallet(userId: string | number): Promise<UserWallet> {
    await execute(
      'INSERT INTO wallets (userId, balance) VALUES (?, 0)',
      [String(userId)]
    );
    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error('Failed to create wallet');
    return wallet;
  }

  async getOrCreateWallet(userId: string | number): Promise<UserWallet> {
    let wallet = await this.getWallet(userId);
    if (!wallet) wallet = await this.createWallet(userId);
    return wallet;
  }

  async getBalance(userId: string | number): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return parseFloat(String(wallet.balance)) || 0;
  }

  async addTransaction(
    userId: string | number,
    amount: number,
    type: 'credit' | 'debit',
    description: string,
    referenceId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded' = 'pending',
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    const wallet = await this.getOrCreateWallet(userId);
    
    const result = await execute(
      `INSERT INTO transactions 
       (walletId, amount, type, description, referenceId, status, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [wallet.id, amount, type, description, referenceId, status, JSON.stringify(metadata || {})]
    );

    // Update wallet balance if transaction is completed
    if (status === 'completed') {
      if (type === 'credit') {
        await execute(
          'UPDATE wallets SET balance = balance + ? WHERE id = ?',
          [amount, wallet.id]
        );
      } else if (type === 'debit') {
        await execute(
          'UPDATE wallets SET balance = balance - ? WHERE id = ?',
          [amount, wallet.id]
        );
      }
    }

    const transactions = await query<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [result.insertId]
    );
    return transactions[0];
  }

  async getTransactions(userId: string | number, limit: number = 50): Promise<Transaction[]> {
    const wallet = await this.getOrCreateWallet(userId);
    
    return await query<Transaction>(
      `SELECT * FROM transactions 
       WHERE walletId = ? 
       ORDER BY createdAt DESC 
       LIMIT ?`,
      [wallet.id, limit]
    );
  }

  async updateTransactionStatus(
    referenceId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<boolean> {
    try {
      // Update transaction status
      await execute(
        'UPDATE transactions SET status = ? WHERE referenceId = ?',
        [status, referenceId]
      );

      // If status changed to completed, update wallet balance
      if (status === 'completed') {
        const transactions = await query<Transaction>(
          'SELECT * FROM transactions WHERE referenceId = ?',
          [referenceId]
        );
        
        if (transactions.length > 0) {
          const transaction = transactions[0];
          
          if (transaction.type === 'credit') {
            await execute(
              'UPDATE wallets SET balance = balance + ? WHERE id = ?',
              [transaction.amount, transaction.walletId]
            );
          } else if (transaction.type === 'debit') {
            await execute(
              'UPDATE wallets SET balance = balance - ? WHERE id = ?',
              [transaction.amount, transaction.walletId]
            );
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      return false;
    }
  }

  async canDeduct(userId: string | number, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  async deductForChatUsage(
    userId: string | number,
    inputTokens: number,
    outputTokens: number
  ): Promise<{ success: boolean; amount: number; message: string }> {
    const pricing = this.getPricingConfig();
    
    // Calculate costs
    const inputCost = (inputTokens / 1000000) * pricing.inputPerMillionPrice;
    const outputCost = (outputTokens / 1000000) * pricing.outputPerMillionPrice;
    const totalCost = inputCost + outputCost;

    if (totalCost <= 0) {
      return { success: true, amount: 0, message: 'No charge for this usage' };
    }

    const canDeduct = await this.canDeduct(userId, totalCost);
    if (!canDeduct) {
      return { 
        success: false, 
        amount: totalCost, 
        message: 'Insufficient balance. Please recharge your wallet.' 
      };
    }

    // Create debit transaction
    await this.addTransaction(
      userId,
      totalCost,
      'debit',
      `Chat usage: ${inputTokens.toLocaleString()} input tokens, ${outputTokens.toLocaleString()} output tokens`,
      `USAGE-${Date.now()}-${userId}`,
      'completed',
      { inputTokens, outputTokens, inputCost, outputCost, totalCost }
    );

    return { 
      success: true, 
      amount: totalCost, 
      message: `BDT ${totalCost.toFixed(2)} deducted for chat usage` 
    };
  }

  getPricingConfig(): PricingConfig {
    return {
      inputPerMillionPrice: parseFloat(process.env.PLATFORM_INPUT_PER_MILLION_PRICE || '10'),
      outputPerMillionPrice: parseFloat(process.env.PLATFORM_OUTPUT_PER_MILLION_PRICE || '15'),
      minimumRechargeAmount: parseFloat(process.env.PLATFORM_MINIMUM_RECHARGE_AMOUNT || '500'),
      prepaidOnly: process.env.PLATFORM_PREPAID_ONLY === 'true'
    };
  }

  validateRechargeAmount(amount: number): { valid: boolean; message: string } {
    const pricing = this.getPricingConfig();
    
    if (amount < pricing.minimumRechargeAmount) {
      return {
        valid: false,
        message: `Minimum recharge amount is BDT ${pricing.minimumRechargeAmount}`
      };
    }

    return { valid: true, message: 'Amount is valid' };
  }
}

export const walletService = new WalletService();