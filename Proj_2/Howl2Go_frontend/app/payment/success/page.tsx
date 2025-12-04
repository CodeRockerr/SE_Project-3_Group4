"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Package, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!orderId) {
        router.push("/orders");
        return;
      }

      try {
        // In a real scenario, you might fetch payment by order ID
        // For now, we'll just show success
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching payment details:", error);
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [orderId, router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <Loader2
          className="w-12 h-12 animate-spin"
          style={{ color: "var(--orange)" }}
        />
      </div>
    );
  }

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
        {/* Success Icon */}
        <div className="relative mb-6">
          <div
            className="absolute inset-0 w-24 h-24 mx-auto rounded-full animate-ping opacity-20"
            style={{ backgroundColor: "var(--success)" }}
          />
          <CheckCircle
            className="w-24 h-24 mx-auto relative"
            style={{ color: "var(--success)" }}
          />
        </div>

        {/* Success Message */}
        <h1
          className="text-4xl font-bold mb-3"
          style={{ color: "var(--text)" }}
        >
          Payment Successful!
        </h1>

        <p className="text-lg mb-6" style={{ color: "var(--text-subtle)" }}>
          Your order has been confirmed and is being prepared.
        </p>

        {/* Order Details */}
        <div
          className="p-6 rounded-xl mb-6"
          style={{
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Package style={{ color: "var(--orange)" }} />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-subtle)" }}
            >
              Order ID
            </span>
          </div>
          <p className="text-lg font-mono" style={{ color: "var(--cream)" }}>
            {orderId || "N/A"}
          </p>
        </div>

        {/* Next Steps */}
        <div
          className="text-left p-4 rounded-lg mb-6"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <h3 className="font-semibold mb-3" style={{ color: "var(--text)" }}>
            What&apos;s Next?
          </h3>
          <ul className="space-y-2" style={{ color: "var(--text-subtle)" }}>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>You&apos;ll receive an email confirmation shortly</span>
            </li>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>Track your order status in real-time</span>
            </li>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>Your food will be delivered soon</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/orders"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
            style={{
              backgroundColor: "var(--orange)",
              color: "var(--text)",
            }}
          >
            View Order Status
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/"
            className="px-6 py-3 rounded-full font-medium"
            style={{ color: "var(--text-subtle)" }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
