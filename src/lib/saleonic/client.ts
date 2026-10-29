/**
 * Official Universal Saleonic REST API Client
 * Compatible with Node.js and Next.js environments.
 * Follows Code-Driven Architecture (item_code, no database IDs).
 */

export interface SaleonicConfig {
  apiKey: string
  baseUrl?: string
}

export interface SaleonicProductPayload {
  name: string
  item_code?: string
  model?: string
  barcode_symbology?: string
  category?: string
  brand?: string
  unit?: string
  regular_price?: number
  selling_price: number
  purchase_price?: number
  opening_stock_quantity?: number
  alert_quantity?: number
  weight?: number
  description?: string
  note?: string
  seo_title?: string
  seo_description?: string
  tags?: string[]
  images?: string[]
  variations?: Array<{
    attribute: string
    value: string
    sku?: string
    price_adjustment?: number
    stock?: number
    image_url?: string
  }>
  specifications?: Array<{
    key: string
    value: string
  }>
  status?: boolean
}

export interface SaleonicResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]>
  [key: string]: any
}

export class SaleonicClient {
  private apiKey: string
  private baseUrl: string

  constructor(config: SaleonicConfig) {
    this.apiKey = config.apiKey.trim()
    this.baseUrl = (config.baseUrl || "https://saleonic.com/api/v1").replace(/\/+$/, "")
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<SaleonicResponse<T>> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    const url = `${this.baseUrl}${cleanEndpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...((options.headers as Record<string, string>) || {}),
    }

    const response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    })

    const json = (await response.json().catch(() => null)) as SaleonicResponse<T> | null

    if (!response.ok) {
      const errorMessage =
        json?.message ||
        `Saleonic HTTP ${response.status}: ${response.statusText || "Request failed"}`
      const err = new Error(errorMessage) as any
      err.status = response.status
      err.errors = json?.errors
      err.data = json
      throw err
    }

    return json || { success: true }
  }

  /**
   * Health Check & Ping
   * Verifies API credentials and connectivity
   */
  async ping(): Promise<{ success: boolean; message?: string; [key: string]: any }> {
    return this.request<{ success: boolean; message: string }>("/ping")
  }

  /**
   * Products API
   */

  /**
   * List all products with optional filters and pagination
   */
  async getProducts(params?: {
    search?: string
    category_id?: number
    brand_id?: number
    limit?: number
    page?: number
  }): Promise<SaleonicResponse> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.set(key, String(val))
        }
      })
    }
    const qs = query.toString()
    return this.request(`/products${qs ? `?${qs}` : ""}`)
  }

  /**
   * Get single product by business code (item_code)
   */
  async getProduct(itemCode: string): Promise<SaleonicResponse> {
    return this.request(`/products/${encodeURIComponent(itemCode)}`)
  }

  /**
   * Create or update product (upsert)
   */
  async saveProduct(payload: SaleonicProductPayload | Record<string, any>): Promise<SaleonicResponse> {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  /**
   * Delete product by item_code
   */
  async deleteProduct(itemCode: string): Promise<SaleonicResponse> {
    return this.request(`/products/${encodeURIComponent(itemCode)}`, {
      method: "DELETE",
    })
  }
}
