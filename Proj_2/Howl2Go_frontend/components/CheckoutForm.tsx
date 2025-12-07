"use client";

import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, CreditCard, CheckCircle, XCircle } from "lucide-react";

interface CheckoutFormProps {
  amount: number;
  orderId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export default function CheckoutForm({
  amount,
  orderId,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?orderId=${orderId}`,
        },
        redirect: "if_required",
      });

      if (error) {
        setMessage(error.message || "Payment failed. Please try again.");
        onError(error.message || "Payment failed");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setIsSuccess(true);
        setMessage("Payment successful!");
        onSuccess(paymentIntent.id);
      } else {
        setMessage("Payment is being processed...");
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setMessage(errorMessage);
      onError(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Payment Details
        </h3>
        <div
          className="flex items-center justify-between p-4 rounded-lg mb-4"
          style={{
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          <span style={{ color: "var(--text-subtle)" }}>Total Amount:</span>
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--cream)" }}
          >
            ${(amount / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div
        className="p-4 rounded-lg mb-6"
        style={{
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
        }}
      >
        <PaymentElement
          options={{
            layout: "tabs",
            // Ensure payment methods are fetched fresh for this customer
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            isSuccess ? "bg-green-500/10" : "bg-red-500/10"
          }`}
          style={{
            border: `1px solid ${
              isSuccess ? "var(--success)" : "var(--error)"
            }`,
          }}
        >
          {isSuccess ? (
            <CheckCircle
              className="w-5 h-5"
              style={{ color: "var(--success)" }}
            />
          ) : (
            <XCircle className="w-5 h-5" style={{ color: "var(--error)" }} />
          )}
          <span
            className="text-sm"
            style={{ color: isSuccess ? "var(--success)" : "var(--error)" }}
          >
            {message}
          </span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing || isSuccess}
        className="w-full py-4 rounded-full font-bold text-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        style={{
          backgroundColor: "var(--orange)",
          color: "var(--text)",
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Payment Complete
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay ${(amount / 100).toFixed(2)}
          </>
        )}
      </button>

      {/* Security Notice */}
      <p
        className="text-xs text-center mt-4"
        style={{ color: "var(--text-muted)" }}
      >
        🔒 Your payment information is encrypted and secure
      </p>
    </form>
  );
}
