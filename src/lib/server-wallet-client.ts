"use server"

export async function getWalletBalanceForUser(userId: number): Promise<number> {
  try {
    // Import wallet service server-side only
    const { walletService } = await import('@/lib/wallet')
    return await walletService.getBalance(userId)
  } catch (error) {
    console.error('Error getting wallet balance:', error)
    return 0
  }
}