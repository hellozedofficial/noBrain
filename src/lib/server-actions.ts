'use server'

import { epsService } from '@/lib/eps'
import { walletService } from '@/lib/wallet'

// This module is server-only - cannot be used in client components
if (typeof window !== 'undefined') {
  throw new Error('Server actions cannot be used in client components')
}

export async function getWalletBalance(userId: number): Promise<number> {
  try {
    return await walletService.getBalance(userId)
  } catch (error) {
    console.error('Error getting wallet balance:', error)
    return 0
  }
}

export async function getWalletTransactions(userId: number, limit: number = 10) {
  try {
    return await walletService.getTransactions(userId, limit)
  } catch (error) {
    console.error('Error getting wallet transactions:', error)
    return []
  }
}

export async function validateRechargeAmount(amount: number) {
  try {
    return walletService.validateRechargeAmount(amount)
  } catch (error) {
    console.error('Error validating recharge amount:', error)
    return { valid: false, message: 'Validation error' }
  }
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
  try {
    return await walletService.addTransaction(
      userId,
      amount,
      type,
      description,
      referenceId,
      status,
      metadata
    )
  } catch (error) {
    console.error('Error adding transaction:', error)
    throw error
  }
}

export async function updateTransactionStatus(
  referenceId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded'
) {
  try {
    return await walletService.updateTransactionStatus(referenceId, status)
  } catch (error) {
    console.error('Error updating transaction status:', error)
    throw error
  }
}

export async function getPricingConfig() {
  try {
    return walletService.getPricingConfig()
  } catch (error) {
    console.error('Error getting pricing config:', error)
    return {
      inputPerMillionPrice: 10,
      outputPerMillionPrice: 15,
      minimumRechargeAmount: 500,
      prepaidOnly: true
    }
  }
}

export async function initiateEPSPayment(
  amount: number,
  customerName: string,
  customerEmail: string,
  customerMobile: string,
  returnUrl: string,
  cancelUrl: string,
  description: string
) {
  try {
    const response = await epsService.initiateTransaction({
      amount,
      customerName,
      customerEmail,
      customerMobile,
      returnUrl,
      cancelUrl,
      description
    })
    
    return response
  } catch (error) {
    console.error('Error initiating EPS payment:', error)
    throw error
  }
}