"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { X, Loader2 } from "lucide-react";
import CheckoutForm from "./CheckoutForm";
import { createPaymentIntent, confirmPayment } from "@/lib/api/payment";
import toast from "react-hot-toast";

// Initialize Stripe - validate key is set
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn("⚠️  WARNING: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set.");
  console.warn("   Payment functionality will not work.");
  console.warn("   Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env.local file");
  console.warn("   Get your keys from: https://dashboard.stripe.com/apikeys");
}

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface PaymentModalProps {
  orderId: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (error: string) => void;
}

export default function PaymentModal({
  orderId,
  amount,
  onClose,
  onSuccess,
  onError,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // Check if Stripe is configured
    if (!stripePublishableKey) {
      const errorMsg = "Payment processing is not configured. Please contact support.";
      setError(errorMsg);
      setIsLoading(false);
      toast.error(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    // Prevent duplicate calls (React Strict Mode in dev)
    if (isInitializing) return;

    // Create payment intent when modal opens
    const initializePayment = async () => {
      try {
        setIsInitializing(true);
        setIsLoading(true);
        const result = await createPaymentIntent(orderId);
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
        setIsLoading(false);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to initialize payment";
        setError(errorMessage);
        setIsLoading(false);
        toast.error(errorMessage);

        // Call onError callback if provided
        if (onError) {
          onError(errorMessage);
        }
      }
    };

    initializePayment();
  }, [orderId, onError, isInitializing]);

  const handlePaymentSuccess = async (intentId: string) => {
    try {
      // Confirm payment on backend
      await confirmPayment(intentId);
      toast.success("Payment successful!");

      // Wait a moment for the user to see the success message
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to confirm payment";
      toast.error(errorMessage);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    toast.error(errorMessage);

    // Call onError callback if provided
    if (onError) {
      onError(errorMessage);
    }
  };

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#c66b4d",
      colorBackground: "#3d3d3d",
      colorText: "#ffffff",
      colorDanger: "#ef4444",
      fontFamily: "Arial, sans-serif",
      borderRadius: "8px",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl p-8"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-subtle)" }}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--text)" }}
          >
            Complete Your Payment
          </h2>
          <p style={{ color: "var(--text-subtle)" }}>
            Enter your payment details to complete your order
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2
              className="w-12 h-12 animate-spin mb-4"
              style={{ color: "var(--orange)" }}
            />
            <p style={{ color: "var(--text-subtle)" }}>
              Initializing secure payment...
            </p>
          </div>
        ) : error ? (
          <div
            className="p-6 rounded-lg text-center"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--error)",
            }}
          >
            <p style={{ color: "var(--error)" }} className="mb-4">
              {error}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full font-medium"
              style={{
                backgroundColor: "var(--orange)",
                color: "var(--text)",
              }}
            >
              Close
            </button>
          </div>
        ) : clientSecret && paymentIntentId && stripePromise ? (
          <Elements
            key={`elements-${clientSecret}`}
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance,
              // Ensure we fetch fresh payment methods for this payment intent's customer
              loader: "always",
            }}
          >
            <CheckoutForm
              amount={amount}
              orderId={orderId}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  );
}
