const mysql = require('mysql2/promise');

async function initializeDatabase() {
  try {
    console.log('Initializing wallet database tables...');
    
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'openrouter_ai',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Create wallets table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL UNIQUE,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table
    await pool.execute(`
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

    console.log('✅ Wallet database tables created successfully');

    // Test creating a wallet for a user
    const testUserId = 1;
    
    // First, ensure users table exists or create a test user
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert test user if not exists
      await pool.execute(
        'INSERT IGNORE INTO users (id, email, name) VALUES (?, ?, ?)',
        [testUserId, 'test@example.com', 'Test User']
      );
    } catch (err) {
      console.log('Note: Using existing users table or skipping user creation');
    }

    // Create test wallet
    const [walletResult] = await pool.execute(
      'INSERT IGNORE INTO wallets (userId, balance) VALUES (?, ?)',
      [testUserId, 1000.00]
    );

    console.log(`✅ Test wallet created/retrieved for user ${testUserId}`);

    // Test adding a transaction
    const [transactionResult] = await pool.execute(
      `INSERT INTO transactions 
       (walletId, amount, type, description, referenceId, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1, 1000, 'credit', 'Initial test credit', `TEST-${Date.now()}`, 'completed']
    );

    console.log('✅ Test transaction created');

    // Test getting balance
    const [balanceRows] = await pool.execute(
      'SELECT balance FROM wallets WHERE userId = ?',
      [testUserId]
    );

    const balance = balanceRows[0]?.balance || 0;
    console.log(`✅ Test user balance: ৳${balance.toFixed(2)}`);

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the development server: npm run dev');
    console.log('2. Visit http://localhost:3000/wallet to test the wallet system');
    console.log('3. Test chat functionality to see balance deduction');

    await pool.end();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase();
}