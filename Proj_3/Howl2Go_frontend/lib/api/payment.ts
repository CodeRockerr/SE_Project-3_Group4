import { apiFetch } from "../api";
export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  payment: { id: string; amount: number; status: string };
}
export interface Payment {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status:
    | "pending"
    | "processing"
    | "succeeded"
    | "failed"
    | "canceled"
    | "refunded";
  paymentIntentId?: string;
  transactionId?: string;
  paymentMethod?: string;
  paymentMethodDetails?: {
    brand?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
/** * Create a payment intent for an order */ export async function createPaymentIntent(
  orderId: string
): Promise<PaymentIntent> {
  const response = await apiFetch("/api/payments/create-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create payment intent");
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to create payment intent");
  }
  return data;
}
/** * Confirm payment after client-side processing */ export async function confirmPayment(
  paymentIntentId: string
): Promise<Payment> {
  const response = await apiFetch("/api/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to confirm payment");
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to confirm payment");
  }
  return data.payment;
}
/** * Get payment by ID */ export async function getPaymentById(
  paymentId: string
): Promise<Payment> {
  const response = await apiFetch(`/api/payments/${paymentId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch payment");
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch payment");
  }
  return data.payment;
}
/** * Get all payments for current user */ export async function getUserPayments(options?: {
  limit?: number;
  skip?: number;
  status?: string;
}): Promise<Payment[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.skip) params.append("skip", options.skip.toString());
  if (options?.status) params.append("status", options.status);
  const url = `/api/payments${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await apiFetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch payments");
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch payments");
  }
  return data.payments;
}

/**
 * Get payments for a specific order
 */
export async function getOrderPayments(orderId: string): Promise<Payment[]> {
  const response = await apiFetch(`/api/payments/order/${orderId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch order payments");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to fetch order payments");
  }

  return data.payments;
}
