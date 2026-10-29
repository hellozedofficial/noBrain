"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Wallet,
  CreditCard,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";

interface PricingConfig {
  inputPerMillionPrice: number;
  outputPerMillionPrice: number;
  minimumRechargeAmount: number;
  prepaidOnly: boolean;
}

interface Transaction {
  id: number;
  walletId: number;
  amount: number;
  type: "credit" | "debit";
  description: string;
  referenceId: string;
  status: "pending" | "completed" | "failed" | "refunded";
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [rechargeAmount, setRechargeAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({
    inputPerMillionPrice: 10,
    outputPerMillionPrice: 15,
    minimumRechargeAmount: 500,
    prepaidOnly: true,
  });

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      // In real app, get userId from auth context
      const mockUserId = 1; // Replace with actual user ID from auth
      setUserId(mockUserId);

      // Fetch wallet data from API
      const response = await fetch("/api/wallet");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBalance(parseFloat(String(data.balance ?? 0)));
          setTransactions(
            (data.transactions ?? []).map((t: any) => ({
              ...t,
              amount: parseFloat(String(t.amount ?? 0)),
            }))
          );
          setPricing(data.pricing);
        } else {
          setError(data.error || "Failed to load wallet data");
        }
      } else {
        setError("Failed to load wallet data");
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error loading wallet:", err);
      setError("Failed to load wallet data");
      setIsLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount < pricing.minimumRechargeAmount) {
      setError(
        `Minimum recharge amount is BDT ${pricing.minimumRechargeAmount}`,
      );
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      // Call recharge API
      const response = await fetch("/api/wallet/recharge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "recharge",
          amount: amount,
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        // Redirect to EPS payment page
        window.location.href = data.paymentUrl;
      } else {
        const errMsg = data.error || 'Failed to initiate payment'
        if (errMsg.includes('merchant configuration') || errMsg.includes('initalizing') || errMsg.includes('initializing')) {
          setError('EPS Sandbox: Merchant account configured নেই। Production credentials দিয়ে সম্পূর্ণ কাজ করবে। (info@eps.com.bd)')
        } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('No response') || errMsg.includes('Network')) {
          setError('EPS gateway সংযোগ সমস্যা। আবার চেষ্টা করুন।')
        } else {
          setError(errMsg)
        }
      }
    } catch (err: any) {
      console.error("Recharge error:", err);
      setError("Payment initiation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    const n = parseFloat(String(amount ?? 0));
    return `৳${isNaN(n) ? "0.00" : n.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      case "pending":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between shrink-0 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Wallet & Recharge
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Balance: {formatCurrency(balance)}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2 text-foreground">
              Wallet Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your balance and recharge your wallet to continue using
              noBrain AI
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Balance & Recharge */}
            <div className="lg:col-span-2 space-y-6">
              {/* Balance Card */}
              <div className="rounded-lg border border-gray-500 bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-muted" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Current Balance
                    </h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available for chat usage
                  </div>
                </div>
                <div className="text-center py-6">
                  <div className="text-5xl font-bold mb-2 text-foreground">
                    {formatCurrency(balance)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This balance will be automatically deducted based on your
                    chat usage
                  </p>
                </div>
              </div>

              {/* Recharge Card */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-muted" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Recharge Wallet
                    </h2>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Minimum: {formatCurrency(pricing.minimumRechargeAmount)}
                  </div>
                </div>

                <div className="space-y-6">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="text-sm text-red-600">{error}</div>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="text-sm text-green-600">{success}</div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Enter Amount (BDT)
                    </label>
                    <input
                      type="number"
                      placeholder={`Minimum ${pricing.minimumRechargeAmount}`}
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      min={pricing.minimumRechargeAmount}
                      step="100"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Amount will be added to your wallet after successful
                      payment
                    </p>
                  </div>

                  <button
                    onClick={handleRecharge}
                    disabled={isProcessing || !rechargeAmount}
                    className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Proceed to Payment"
                    )}
                  </button>

                  <div className="text-center text-sm text-muted-foreground">
                    You will be redirected to EPS secure payment page
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Pricing & Transactions */}
            <div className="space-y-6">
              {/* Pricing Info */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Pricing
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Current rates per million tokens
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Input
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(pricing.inputPerMillionPrice)}/M Tokens
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Output
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(pricing.outputPerMillionPrice)}/M Tokens
                    </span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">
                        Platform Mode
                      </span>
                      <span
                        className={`font-semibold ${pricing.prepaidOnly ? "text-green-500" : "text-blue-500"}`}
                      >
                        {pricing.prepaidOnly ? "Prepaid Only" : "Postpaid"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              {/* <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Recent Transactions
                  </h3>
                </div>
                <div>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((txn) => (
                        <div
                          key={txn.id}
                          className="border border-border rounded-lg p-4 hover:bg-sidebar-hover transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-foreground">
                                {txn.description}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(txn.createdAt)}
                              </div>
                            </div>
                            <div
                              className={`font-bold ${txn.type === "credit" ? "text-green-500" : "text-red-500"}`}
                            >
                              {txn.type === "credit" ? "+" : "-"}
                              {formatCurrency(txn.amount)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Ref: {txn.referenceId.slice(0, 12)}...
                            </div>
                            <div
                              className={`text-sm flex items-center gap-1 ${getStatusColor(txn.status)}`}
                            >
                              {getStatusIcon(txn.status)}
                              {txn.status.charAt(0).toUpperCase() +
                                txn.status.slice(1)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
