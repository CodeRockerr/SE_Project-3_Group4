"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, AlertCircle, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";

function PaymentFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const error = searchParams.get("error");

  const handleRetry = () => {
    if (orderId) {
      router.push(`/cart?retryOrder=${orderId}`);
    } else {
      router.push("/cart");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Error Icon */}
        <div className="relative mb-6">
          <div
            className="absolute inset-0 w-24 h-24 mx-auto rounded-full animate-ping opacity-20"
            style={{ backgroundColor: "var(--error)" }}
          />
          <XCircle
            className="w-24 h-24 mx-auto relative"
            style={{ color: "var(--error)" }}
          />
        </div>

        {/* Error Message */}
        <h1
          className="text-4xl font-bold mb-3"
          style={{ color: "var(--text)" }}
        >
          Payment Failed
        </h1>

        <p className="text-lg mb-6" style={{ color: "var(--text-subtle)" }}>
          We couldn&apos;t process your payment. Your order has not been placed.
        </p>

        {/* Error Details */}
        {error && (
          <div
            className="p-4 rounded-xl mb-6 flex items-start gap-3"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--error)",
            }}
          >
            <AlertCircle
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: "var(--error)" }}
            />
            <div className="text-left">
              <p className="font-medium mb-1" style={{ color: "var(--text)" }}>
                Error Details
              </p>
              <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Common Reasons */}
        <div
          className="text-left p-4 rounded-lg mb-6"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <h3 className="font-semibold mb-3" style={{ color: "var(--text)" }}>
            Common Reasons:
          </h3>
          <ul
            className="space-y-2 text-sm"
            style={{ color: "var(--text-subtle)" }}
          >
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Insufficient funds in your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Incorrect card details entered</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Card expired or blocked</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Network or connection issues</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
            style={{
              backgroundColor: "var(--orange)",
              color: "var(--text)",
            }}
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <Link
            href="/cart"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text-subtle)",
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Cart
          </Link>

          <Link
            href="/"
            className="px-6 py-3 rounded-full font-medium"
            style={{ color: "var(--text-subtle)" }}
          >
            Back to Home
          </Link>
        </div>

        {/* Support */}
        <div
          className="mt-8 pt-6 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
            Need help?{" "}
            <Link
              href="/bug-report"
              className="underline"
              style={{ color: "var(--orange)" }}
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <Loader2
            className="w-12 h-12 animate-spin"
            style={{ color: "var(--orange)" }}
          />
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
