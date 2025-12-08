import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "usd",
      uppercase: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "canceled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentIntentId: {
      type: String,
      sparse: true,
      index: true,
    },
    transactionId: {
      type: String,
      sparse: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "apple_pay", "google_pay", "other"],
    },
    paymentMethodDetails: {
      brand: String, // visa, mastercard, etc.
      last4: String,
      expiryMonth: Number,
      expiryYear: Number,
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    failureReason: {
      type: String,
    },
    refundReason: {
      type: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual("formattedAmount").get(function () {
  return `$${(this.amount / 100).toFixed(2)}`;
});

// Method to check if payment is finalized
paymentSchema.methods.isFinalized = function () {
  return ["succeeded", "failed", "canceled", "refunded"].includes(this.status);
};

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function () {
  return this.status === "succeeded";
};

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
