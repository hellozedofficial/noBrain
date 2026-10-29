import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use dynamic import for ES modules
const modulePath = join(__dirname, '..', 'src', 'lib', 'wallet.ts');
const { walletService } = await import(modulePath);

async function initializeDatabase() {
  try {
    console.log('Initializing wallet database tables...')
    
    await walletService.initializeWalletTables()
    
    console.log('✅ Wallet database tables created successfully')
    
    // Test creating a wallet for a user
    const testUserId = 1
    const wallet = await walletService.getOrCreateWallet(testUserId)
    console.log(`✅ Test wallet created/retrieved for user ${testUserId}:`, wallet)
    
    // Test adding a transaction
    const transaction = await walletService.addTransaction(
      testUserId,
      1000,
      'credit',
      'Initial test credit',
      `TEST-${Date.now()}`,
      'completed'
    )
    console.log('✅ Test transaction created:', transaction)
    
    // Test getting balance
    const balance = await walletService.getBalance(testUserId)
    console.log(`✅ Test user balance: ৳${balance.toFixed(2)}`)
    
    console.log('\n🎉 Database initialization completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run the development server: npm run dev')
    console.log('2. Visit http://localhost:3000/wallet to test the wallet system')
    console.log('3. Test chat functionality to see balance deduction')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase()
}