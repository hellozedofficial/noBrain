const crypto = require('crypto');
const https = require('https');

const username = 'Epsdemo@gmail.com';
const password = 'Epsdemo258@';
const hashKey = 'FHZxyzeps56789gfhg678ygu876o=';
const merchantId = '29e86e70-0ac6-45eb-ba04-9fcb0aaed12a';
const storeId = 'd44e705f-9e3a-41de-98b1-1674631637da';

function generateHash(value, key) {
  const keyBytes = Buffer.from(key, 'utf8');
  const hmac = crypto.createHmac('sha512', keyBytes);
  hmac.update(value);
  return hmac.digest('base64');
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== EPS Sandbox API Test ===\n');

  // Step 1: Get Token
  const hash = generateHash(username, hashKey);
  console.log('1. Getting token...');
  console.log('   Hash:', hash.slice(0, 20) + '...');
  
  try {
    const tokenRes = await httpsPost(
      'sandboxpgapi.eps.com.bd',
      '/v1/Auth/GetToken',
      { 'x-hash': hash },
      { userName: username, password: password }
    );
    
    console.log('   Status:', tokenRes.status);
    console.log('   Body:', tokenRes.body);
    
    if (tokenRes.status === 200) {
      const tokenData = JSON.parse(tokenRes.body);
      const token = tokenData.token;
      console.log('\n   Token obtained:', token ? token.slice(0, 30) + '...' : 'NONE');
      
      // Step 2: Initialize Payment
      const merchantTxnId = Date.now().toString() + '000';
      const payHash = generateHash(merchantTxnId, hashKey);
      
      console.log('\n2. Initializing payment...');
      const payRes = await httpsPost(
        'sandboxpgapi.eps.com.bd',
        '/v1/EPSEngine/InitializeEPS',
        { 'x-hash': payHash, 'Authorization': `Bearer ${token}` },
        {
          merchantId,
          storeId,
          CustomerOrderId: 'ORD-TEST-001',
          merchantTransactionId: merchantTxnId,
          transactionTypeId: 1,
          financialEntityId: 0,
          transitionStatusId: 0,
          totalAmount: 500,
          ipAddress: '0.0.0.0',
          version: '1',
          successUrl: 'http://localhost:3000/wallet/success',
          failUrl: 'http://localhost:3000/wallet/cancel',
          cancelUrl: 'http://localhost:3000/wallet/cancel',
          customerName: 'Test User',
          customerEmail: 'test@example.com',
          CustomerAddress: 'Dhaka',
          CustomerCity: 'Dhaka',
          CustomerState: 'Dhaka',
          CustomerPostcode: '1207',
          CustomerCountry: 'BD',
          CustomerPhone: '01700000000',
          ShipmentName: '',
          ShipmentAddress: '',
          ShipmentAddress2: '',
          ShipmentCity: '',
          ShipmentState: '',
          ShipmentPostcode: '',
          ShipmentCountry: '',
          ValueA: '', ValueB: '', ValueC: '', ValueD: '',
          ShippingMethod: 'NO',
          NoOfItem: '1',
          ProductName: 'noBrain Platform Recharge',
          ProductProfile: 'general',
          ProductCategory: 'Digital Service',
          ProductList: []
        }
      );
      console.log('   Status:', payRes.status);
      console.log('   Body:', payRes.body);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

main();
