import 'server-only';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────
// EPS API endpoints (verified working)
// sandbox: sandboxpgapi.eps.com.bd (no hyphen)
// ─────────────────────────────────────────
const ENDPOINTS = {
  SANDBOX: {
    GET_TOKEN: 'https://sandboxpgapi.eps.com.bd/v1/Auth/GetToken',
    INITIALIZE: 'https://sandboxpgapi.eps.com.bd/v1/EPSEngine/InitializeEPS',
    VERIFY: 'https://sandboxpgapi.eps.com.bd/v1/EPSEngine/CheckMerchantTransactionStatus',
  },
  PRODUCTION: {
    GET_TOKEN: 'https://pgapi.eps.com.bd/v1/Auth/GetToken',
    INITIALIZE: 'https://pgapi.eps.com.bd/v1/EPSEngine/InitializeEPS',
    VERIFY: 'https://pgapi.eps.com.bd/v1/EPSEngine/CheckMerchantTransactionStatus',
  },
};

// HMACSHA512 hash per EPS docs
function generateHash(value: string, hashKey: string): string {
  const hmac = crypto.createHmac('sha512', Buffer.from(hashKey, 'utf8'));
  hmac.update(value);
  return hmac.digest('base64');
}

// Generate unique merchant transaction ID (min 10 digits, timestamp-based)
export function generateTransactionId(): string {
  return Date.now().toString() + Math.floor(Math.random() * 999).toString().padStart(3, '0');
}

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface EPSTransactionRequest {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  description?: string;
  successUrl: string;   // EPS will append ?Status=Success&MerchantTransactionId=xxx
  failUrl: string;      // EPS will append ?Status=Failed&MerchantTransactionId=xxx
  cancelUrl: string;    // EPS will append ?Status=Cancelled&MerchantTransactionId=xxx
  orderId?: string;
}

export interface EPSTransactionResponse {
  success: boolean;
  merchantTransactionId: string;
  epsTransactionId?: string;
  paymentUrl: string;
  message?: string;
  error?: string;
}

export interface EPSPaymentStatus {
  success: boolean;
  status: 'Success' | 'Failed' | 'Pending';
  merchantTransactionId: string;
  epsTransactionId?: string;
  amount?: string;
  paymentDate?: string;
  paymentMethod?: string;
  message?: string;
  error?: string;
}

// ─────────────────────────────────────────
// EPS Service
// ─────────────────────────────────────────
class EPSService {
  private readonly config = {
    username: process.env.PLATFORM_EPS_USERNAME!,
    password: process.env.PLATFORM_EPS_PASSWORD!,
    hashKey: process.env.PLATFORM_EPS_HASH_KEY!,
    merchantId: process.env.PLATFORM_EPS_MERCHANT_ID!,
    storeId: process.env.PLATFORM_EPS_STORE_ID!,
    sandbox: process.env.PLATFORM_EPS_SANDBOX === 'true',
  };

  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  private get endpoints() {
    return this.config.sandbox ? ENDPOINTS.SANDBOX : ENDPOINTS.PRODUCTION;
  }

  private httpClient: AxiosInstance = axios.create({
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  // ── JWT Token (cached until expiry) ──────
  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }
    const hash = generateHash(this.config.username, this.config.hashKey);
    const res = await this.httpClient.post(this.endpoints.GET_TOKEN,
      { userName: this.config.username, password: this.config.password },
      { headers: { 'x-hash': hash } }
    );
    const data = res.data;
    if (!data.token) throw new Error(`EPS Auth failed: ${data.errorMessage || 'No token'}`);
    this.token = data.token;
    this.tokenExpiry = new Date(data.expireDate);
    return this.token!;
  }

  // ── Initiate Payment ──────────────────────
  async initiateTransaction(req: EPSTransactionRequest): Promise<EPSTransactionResponse> {
    try {
      const token = await this.getToken();
      const merchantTransactionId = generateTransactionId();
      const orderId = req.orderId || `ORD-${Date.now()}`;
      const hash = generateHash(merchantTransactionId, this.config.hashKey);

      const res = await this.httpClient.post(this.endpoints.INITIALIZE, {
        merchantId: this.config.merchantId,
        storeId: this.config.storeId,
        CustomerOrderId: orderId,
        merchantTransactionId,
        transactionTypeId: 1,       // WEB
        financialEntityId: 0,
        transitionStatusId: 0,
        totalAmount: req.amount,
        ipAddress: '0.0.0.0',
        version: '1',
        successUrl: req.successUrl,
        failUrl: req.failUrl,
        cancelUrl: req.cancelUrl,
        customerName: req.customerName,
        customerEmail: req.customerEmail,
        CustomerAddress: 'Dhaka',
        CustomerAddress2: '',
        CustomerCity: 'Dhaka',
        CustomerState: 'Dhaka',
        CustomerPostcode: '1207',
        CustomerCountry: 'BD',
        CustomerPhone: req.customerMobile,
        ShipmentName: '', ShipmentAddress: '', ShipmentAddress2: '',
        ShipmentCity: '', ShipmentState: '', ShipmentPostcode: '', ShipmentCountry: '',
        ValueA: '', ValueB: '', ValueC: '', ValueD: '',
        ShippingMethod: 'NO',
        NoOfItem: '1',
        ProductName: req.description || 'noBrain Platform Recharge',
        ProductProfile: 'general',
        ProductCategory: 'Digital Service',
        ProductList: [],
      }, { headers: { 'x-hash': hash, Authorization: `Bearer ${token}` } });

      const data = res.data;
      if (!data.RedirectURL) {
        throw new Error(data.ErrorMessage || 'EPS payment initialization failed');
      }

      return {
        success: true,
        merchantTransactionId,
        epsTransactionId: data.TransactionId,
        paymentUrl: data.RedirectURL,
        message: 'Payment initiated successfully',
      };
    } catch (error: any) {
      console.error('EPS initiateTransaction error:', error?.response?.data?.ErrorMessage || error?.message);
      return {
        success: false,
        merchantTransactionId: '',
        paymentUrl: '',
        error: error?.response?.data?.ErrorMessage || error?.message || 'EPS gateway error',
      };
    }
  }

  // ── Verify Payment ───────────────────────
  async verifyPayment(merchantTransactionId: string): Promise<EPSPaymentStatus> {
    try {
      const token = await this.getToken();
      const hash = generateHash(merchantTransactionId, this.config.hashKey);
      const params = new URLSearchParams({ merchantTransactionId });
      const res = await this.httpClient.get(
        `${this.endpoints.VERIFY}?${params.toString()}`,
        { headers: { 'x-hash': hash, Authorization: `Bearer ${token}` } }
      );
      const data = res.data;
      const status =
        data.Status?.toLowerCase() === 'success' ? 'Success' :
        data.Status?.toLowerCase() === 'pending'  ? 'Pending' : 'Failed';
      return {
        success: status === 'Success',
        status,
        merchantTransactionId: data.MerchantTransactionId,
        epsTransactionId: data.EpsTransactionId,
        amount: data.TotalAmount,
        paymentDate: data.TransactionDate,
        paymentMethod: data.FinancialEntity,
        message: data.ErrorMessage || undefined,
      };
    } catch (error: any) {
      console.error('EPS verifyPayment error:', error?.message);
      return {
        success: false,
        status: 'Failed',
        merchantTransactionId,
        error: error?.message || 'Payment verification failed',
      };
    }
  }
}

export const epsService = new EPSService();
