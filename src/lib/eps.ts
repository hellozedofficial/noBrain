import 'server-only';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// EPS API endpoints — per integration guide V5
// ─────────────────────────────────────────────────────────────────────────────
const ENDPOINTS = {
  PRODUCTION: {
    GET_TOKEN: 'https://pgapi.eps.com.bd/v1/Auth/GetToken',
    INITIALIZE: 'https://pgapi.eps.com.bd/v1/EPSEngine/InitializeEPS',
    VERIFY: 'https://pgapi.eps.com.bd/v1/EPSEngine/CheckMerchantTransactionStatus',
  },
  SANDBOX: {
    GET_TOKEN: 'https://sandboxpgapi.eps.com.bd/v1/Auth/GetToken',
    INITIALIZE: 'https://sandboxpgapi.eps.com.bd/v1/EPSEngine/InitializeEPS',
    VERIFY: 'https://sandboxpgapi.eps.com.bd/v1/EPSEngine/CheckMerchantTransactionStatus',
  },
};

/**
 * EPS Hash generation — per docs:
 *   Step 1: Encode hashKey using UTF-8
 *   Step 2: Create HMACSHA512 using encoded key
 *   Step 3: Compute hash using the value (userId / merchantTransactionId)
 *   Step 4: Return Base64 string
 */
function generateHash(value: string, hashKey: string): string {
  const hmac = crypto.createHmac('sha512', Buffer.from(hashKey, 'utf8'));
  hmac.update(value);
  return hmac.digest('base64');
}

/** Unique merchant transaction ID — minimum 10 digits, timestamp-based */
export function generateTransactionId(): string {
  return Date.now().toString() + Math.floor(Math.random() * 999).toString().padStart(3, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface EPSTransactionRequest {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  description?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// EPS Service
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── API 01: GetToken ──────────────────────────────────────────────────────
  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    // Hash is generated with username as the value, per docs
    const hash = generateHash(this.config.username, this.config.hashKey);

    const res = await this.httpClient.post(
      this.endpoints.GET_TOKEN,
      {
        userName: this.config.username,
        password: this.config.password,
      },
      {
        headers: { 'x-hash': hash },
      }
    );

    const data = res.data;
    if (!data.token) {
      throw new Error(`EPS Auth failed: ${data.errorMessage || data.ErrorMessage || 'No token returned'}`);
    }

    this.token = data.token;
    this.tokenExpiry = new Date(data.expireDate);
    return this.token!;
  }

  // ── API 02: InitializeEPS ─────────────────────────────────────────────────
  async initiateTransaction(req: EPSTransactionRequest): Promise<EPSTransactionResponse> {
    try {
      const token = await this.getToken();
      const merchantTransactionId = generateTransactionId();
      const orderId = req.orderId || `ORD-${Date.now()}`;

      // Hash is generated with merchantTransactionId as the value, per docs
      const hash = generateHash(merchantTransactionId, this.config.hashKey);

      // Per EPS docs V5 body — merchantId is NOT sent, only storeId
      const body = {
        storeId: this.config.storeId,
        CustomerOrderId: orderId,
        merchantTransactionId,
        transactionTypeId: 1,     // 1 = Web
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
        CustomerAddress: 'Dhaka, Bangladesh',
        CustomerAddress2: '',
        CustomerCity: 'Dhaka',
        CustomerState: 'Dhaka',
        CustomerPostcode: '1207',
        CustomerCountry: 'BD',
        CustomerPhone: req.customerMobile,
        ShipmentName: '',
        ShipmentAddress: '',
        ShipmentAddress2: '',
        ShipmentCity: '',
        ShipmentState: '',
        ShipmentPostcode: '',
        ShipmentCountry: '',
        ValueA: '',
        ValueB: '',
        ValueC: '',
        ValueD: '',
        ShippingMethod: 'NO',
        NoOfItem: '1',
        ProductName: req.description || 'noBrain Platform Recharge',
        ProductProfile: 'general',
        ProductCategory: 'Digital Service',
        ProductList: [],
      };

      const res = await this.httpClient.post(this.endpoints.INITIALIZE, body, {
        headers: {
          'x-hash': hash,
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = res.data;

      if (!data.RedirectURL) {
        throw new Error(data.ErrorMessage || data.errorMessage || 'EPS: No RedirectURL returned');
      }

      return {
        success: true,
        merchantTransactionId,
        epsTransactionId: data.TransactionId,
        paymentUrl: data.RedirectURL,
        message: 'Payment initiated successfully',
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const errData = error?.response?.data;
      const errMsg =
        errData?.ErrorMessage ||
        errData?.errorMessage ||
        errData?.message ||
        error?.message ||
        'EPS gateway error';

      console.error(
        '[EPS] initiateTransaction failed:',
        'status:', status,
        'message:', errMsg,
        'body:', JSON.stringify(errData)
      );

      return {
        success: false,
        merchantTransactionId: '',
        paymentUrl: '',
        error: errMsg,
      };
    }
  }

  // ── API 03: Verify Transaction ────────────────────────────────────────────
  async verifyPayment(merchantTransactionId: string): Promise<EPSPaymentStatus> {
    try {
      const token = await this.getToken();
      const hash = generateHash(merchantTransactionId, this.config.hashKey);

      const res = await this.httpClient.get(
        `${this.endpoints.VERIFY}?merchantTransactionId=${merchantTransactionId}`,
        {
          headers: {
            'x-hash': hash,
            'Authorization': `Bearer ${token}`,
          },
        }
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
      console.error('[EPS] verifyPayment failed:', error?.message);
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
