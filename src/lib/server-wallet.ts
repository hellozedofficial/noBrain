"use server"

import { walletService } from '@/lib/wallet'

export async function getWalletBalance(userId: number): Promise<number> {
  return await walletService.getBalance(userId)
}

export async function getWalletTransactions(userId: number, limit: number = 20) {
  return await walletService.getTransactions(userId, limit)
}

export async function validateRechargeAmount(amount: number) {
  return walletService.validateRechargeAmount(amount)
}

export async function addTransaction(
  userId: number,
  amount: number,
  type: 'credit' | 'debit',
  description: string,
  referenceId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded' = 'pending',
  metadata?: Record<string, any>
) {
  return await walletService.addTransaction(
    userId,
    amount,
    type,
    description,
    referenceId,
    status,
    metadata
  )
}

export async function updateTransactionStatus(
  referenceId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded'
) {
  return await walletService.updateTransactionStatus(referenceId, status)
}

export async function getPricingConfig() {
  return walletService.getPricingConfig()
}