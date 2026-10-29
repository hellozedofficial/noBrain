"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Wallet,
  CreditCard,
  CheckCircle,
  XCircle,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [rechargeAmount, setRechargeAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({
    inputPerMillionPrice: 10,
    outputPerMillionPrice: 15,
    minimumRechargeAmount: 500,
    prepaidOnly: true,
  });

  useEffect(() => { loadWalletData(); }, []);

  const loadWalletData = async () => {
    try {
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
        }
      }
    } catch {}
    finally { setIsLoading(false); }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) { setError("Please enter a valid amount"); return; }
    if (amount < pricing.minimumRechargeAmount) {
      setError(`Minimum recharge amount is ৳${pricing.minimumRechargeAmount}`);
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      const response = await fetch("/api/wallet/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recharge", amount }),
      });
      const data = await response.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        const msg = data.error || "Failed to initiate payment";
        setError(
          msg.includes("merchant") || msg.includes("initaliz") || msg.includes("initializ")
            ? "EPS Sandbox: Merchant account configured নেই। Production credentials দিয়ে কাজ করবে।"
            : msg.includes("ENOTFOUND") || msg.includes("Network")
            ? "EPS gateway সংযোগ সমস্যা। আবার চেষ্টা করুন।"
            : msg
        );
      }
    } catch {
      setError("Payment initiation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fmt = (v: number | string | null | undefined) =>
    `৳${parseFloat(String(v ?? 0)).toFixed(2)}`;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#444]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#ececec]">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-6 bg-[#111] border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-semibold text-[#ececec] hover:text-white transition-colors no-underline">
            noBrain
          </Link>
          <span className="text-[#333]">/</span>
          <span className="text-sm text-[#888] flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Wallet
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#555]">Balance:</span>
          <span className="text-sm font-semibold text-green-400">{fmt(balance)}</span>
          <Link href="/" className="px-3 py-1.5 text-xs font-medium text-[#ececec] bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] rounded-lg transition-colors no-underline">
            Chat
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-5 py-10">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Wallet</h1>
          <p className="text-sm text-[#666]">Manage your balance and recharge to use noBrain AI.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Left: balance + recharge ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Balance card */}
            <div className="p-6 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <div className="flex items-center gap-2 mb-5">
                <Wallet className="h-4 w-4 text-[#555]" />
                <span className="text-xs font-semibold text-[#555] uppercase tracking-widest">Current Balance</span>
              </div>
              <div className="text-center py-4">
                <div className="text-5xl font-bold text-white mb-2">{fmt(balance)}</div>
                <p className="text-xs text-[#555]">Automatically deducted based on chat usage</p>
              </div>
              {balance < 10 && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Low balance — recharge to continue chatting.
                </div>
              )}
            </div>

            {/* Recharge card */}
            <div className="p-6 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#555]" />
                  <span className="text-xs font-semibold text-[#555] uppercase tracking-widest">Recharge Wallet</span>
                </div>
                <span className="text-xs text-[#444]">Min: {fmt(pricing.minimumRechargeAmount)}</span>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Quick amount buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setRechargeAmount(String(q))}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium border transition-all",
                      rechargeAmount === String(q)
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-transparent border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-[#ccc]"
                    )}
                  >
                    ৳{q}
                  </button>
                ))}
              </div>

              {/* Custom amount input */}
              <div className="mb-4">
                <input
                  type="number"
                  placeholder={`Custom amount (min ৳${pricing.minimumRechargeAmount})`}
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#ececec] placeholder-[#444] outline-none focus:border-[#3a3a3a] transition-colors"
                  min={pricing.minimumRechargeAmount}
                  step="100"
                />
              </div>

              <button
                onClick={handleRecharge}
                disabled={isProcessing || !rechargeAmount}
                className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <>Proceed to Payment {rechargeAmount ? `— ৳${parseFloat(rechargeAmount) || 0}` : ""}</>
                )}
              </button>

              <p className="text-center text-xs text-[#444] mt-3 flex items-center justify-center gap-1">
                Redirects to secure payment gateway
              </p>
            </div>

            {/* Transactions */}
            <div className="p-6 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="h-4 w-4 text-[#555]" />
                <span className="text-xs font-semibold text-[#555] uppercase tracking-widest">Transaction History</span>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-10 text-[#444]">
                  <Clock className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg hover:border-[#222] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                          txn.type === "credit" ? "bg-green-500/10" : "bg-red-500/10"
                        )}>
                          {txn.type === "credit"
                            ? <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                            : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#ccc] truncate">{txn.description}</p>
                          <p className="text-[10px] text-[#444] mt-0.5">{fmtDate(txn.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={cn("text-sm font-semibold", txn.type === "credit" ? "text-green-400" : "text-red-400")}>
                          {txn.type === "credit" ? "+" : "-"}{fmt(txn.amount)}
                        </p>
                        <p className={cn("text-[10px] capitalize mt-0.5",
                          txn.status === "completed" ? "text-green-500/70"
                          : txn.status === "failed" ? "text-red-500/70"
                          : "text-yellow-500/70"
                        )}>
                          {txn.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: pricing info ───────────────────────────────── */}
          <div className="space-y-5">
            <div className="p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-[#555]" />
                <span className="text-xs font-semibold text-[#555] uppercase tracking-widest">Pricing</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
                  <span className="text-xs text-[#666]">Input tokens</span>
                  <span className="text-xs font-semibold text-[#ccc]">{fmt(pricing.inputPerMillionPrice)}<span className="text-[#444] font-normal">/M</span></span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
                  <span className="text-xs text-[#666]">Output tokens</span>
                  <span className="text-xs font-semibold text-[#ccc]">{fmt(pricing.outputPerMillionPrice)}<span className="text-[#444] font-normal">/M</span></span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-[#666]">Mode</span>
                  <span className={cn("text-xs font-semibold", pricing.prepaidOnly ? "text-green-400" : "text-blue-400")}>
                    {pricing.prepaidOnly ? "Prepaid" : "Postpaid"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#111] border border-[#1f1f1f] rounded-xl">
              <p className="text-xs text-[#555] font-semibold uppercase tracking-widest mb-3">How it works</p>
              <ul className="space-y-2.5 text-xs text-[#666] leading-relaxed">
                <li className="flex gap-2"><span className="text-purple-400 shrink-0">1.</span> Recharge your wallet with BDT</li>
                <li className="flex gap-2"><span className="text-purple-400 shrink-0">2.</span> Each chat message deducts tokens from balance</li>
                <li className="flex gap-2"><span className="text-purple-400 shrink-0">3.</span> Top up anytime to continue chatting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


