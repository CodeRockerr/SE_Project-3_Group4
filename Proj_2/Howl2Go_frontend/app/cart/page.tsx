"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { createOrder } from "@/lib/api/order";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";
import ComboSuggestionsModal from "@/components/ComboSuggestionsModal";
import { getComboSuggestions } from "@/lib/api/combo";
import PaymentModal from "@/components/PaymentModal";

export default function CartPage() {
  const router = useRouter();
  const {
    items: cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    summary,
    isLoading: isCartLoading,
    addToCart,
    addMultipleToCart,
  } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Order state
  const [isProcessing, setIsProcessing] = useState(false);
  const [comboSuggestions, setComboSuggestions] = useState<any[]>([]);
  const [showComboModal, setShowComboModal] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null); // Fetch combo suggestions when user clicks the button
  const handleCompleteYourMeal = async () => {
    if (!cartItems || cartItems.length === 0) {
      toast.error("Add an item to your cart first");
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const main = cartItems[0];
      const mainId = main.foodItem._id as string;
      const suggestions = await getComboSuggestions(mainId, 5);

      if (suggestions && suggestions.length > 0) {
        // Filter out suggestions that are already in the cart
        const cartItemIds = new Set(cartItems.map((item) => item.foodItem._id));
        const filteredSuggestions = suggestions.filter(
          (s) => !cartItemIds.has(s.item._id)
        );

        if (filteredSuggestions.length > 0) {
          setComboSuggestions(filteredSuggestions);
          setShowComboModal(true);
        } else {
          toast("All suggested items are already in your cart!");
        }
      } else {
        toast("No combo suggestions available for this item.");
      }
    } catch (err) {
      console.error("Failed to load combo suggestions", err);
      toast.error("Failed to load combo suggestions");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Apply preferences from the modal (nutritional focus / dietary flags)
  const handleApplyPreferences = async (opts: {
    nutritional_focus?: string;
    preferences?: Record<string, any>;
  }) => {
    if (!cartItems || cartItems.length === 0) return [];
    setIsLoadingSuggestions(true);
    try {
      const main = cartItems[0];
      const mainId = main.foodItem._id;
      const suggestions = await getComboSuggestions(mainId, 5, opts);

      // Filter out suggestions that are already in the cart
      const cartItemIds = new Set(cartItems.map((item) => item.foodItem._id));
      const filteredSuggestions = suggestions.filter(
        (s) => !cartItemIds.has(s.item._id)
      );

      if (filteredSuggestions.length > 0) {
        setComboSuggestions(filteredSuggestions);
        setShowComboModal(true);
      } else {
        toast("All suggested items are already in your cart!");
      }

      return filteredSuggestions;
    } catch (err) {
      console.error("Failed to load combo suggestions", err);
      toast.error("Failed to load combo suggestions");
      return [];
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Increase quantity
  const increaseQuantity = async (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    if (item) {
      try {
        await updateQuantity(id, item.quantity + 1);
      } catch (error) {
        console.error("Failed to update quantity:", error);
        // You could show a toast notification here
      }
    }
  };

  // Decrease quantity
  const decreaseQuantity = async (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    if (item && item.quantity > 1) {
      try {
        await updateQuantity(id, item.quantity - 1);
      } catch (error) {
        console.error("Failed to update quantity:", error);
        // You could show a toast notification here
      }
    }
  };

  // Destructure summary
  const { totalItems, subtotal, tax, deliveryFee, total } = summary;

  // Place Order handler - now triggers payment flow
  const handlePlaceOrder = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error("Please log in to place an order");
      router.push("/login?redirect=/cart");
      return;
    }

    // Check if cart is empty
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsProcessing(true);

    try {
      // Create order in MongoDB (status: pending, paymentStatus: pending)
      const order = await createOrder();

      console.log("Order created, initiating payment:", order);

      // Save order info
      setCurrentOrderId(order._id);

      setIsProcessing(false);

      // Show payment modal
      setShowPaymentModal(true);
    } catch (error: unknown) {
      console.error("Failed to create order:", error);
      setIsProcessing(false);

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create order. Please try again.";
      toast.error(errorMessage);

      // If authentication error, redirect to login
      if (
        errorMessage.includes("Authentication") ||
        errorMessage.includes("401")
      ) {
        setTimeout(() => {
          router.push("/login?redirect=/cart");
        }, 2000);
      }
    }
  };

  // Payment success handler
  const handlePaymentSuccess = async () => {
    try {
      // Clear the cart after successful payment
      await clearCart();

      setShowPaymentModal(false);
      toast.success("Payment successful!");

      // Redirect to success page
      router.push(`/payment/success?orderId=${currentOrderId}`);
    } catch (error) {
      console.error("Error after payment success:", error);
      // Still redirect to success page even if cart clear fails
      router.push(`/payment/success?orderId=${currentOrderId}`);
    }
  };

  // Payment failure handler
  const handlePaymentError = (error: string) => {
    setShowPaymentModal(false);
    toast.error("Payment failed");

    // Redirect to failure page with error details
    const errorMessage = encodeURIComponent(error);
    router.push(
      `/payment/failed?orderId=${currentOrderId}&error=${errorMessage}`
    );
  };

  return (
    <div
      className="min-h-screen pb-20"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg transition-colors"
              style={{
                color: "var(--text-subtle)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <ShoppingBag
                className="w-8 h-8"
                style={{ color: "var(--orange)" }}
              />
              <h1
                className="text-3xl font-bold"
                style={{ color: "var(--text)" }}
              >
                Shopping Cart
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isCartLoading ? (
          <LoadingSpinner
            message="Loading your cart..."
            size="lg"
            fullScreen={false}
          />
        ) : cartItems.length === 0 ? (
          // Empty Cart State
          <div className="text-center py-20">
            <ShoppingBag
              className="w-20 h-20 mx-auto mb-4"
              style={{ color: "var(--text-muted)" }}
            />
            <h2
              className="text-2xl font-semibold mb-2"
              style={{ color: "var(--text)" }}
            >
              Your cart is empty
            </h2>
            <p className="mb-6" style={{ color: "var(--text-subtle)" }}>
              Add some delicious items to get started!
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 rounded-full font-semibold transition-all hover:scale-105"
              style={{
                backgroundColor: "var(--orange)",
                color: "var(--text)",
              }}
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {totalItems} {totalItems === 1 ? "Item" : "Items"}
                  </h2>
                  <button
                    onClick={() => clearCart()}
                    className="text-sm font-medium transition-colors"
                    style={{ color: "var(--text-subtle)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--error)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-subtle)";
                    }}
                  >
                    Clear Cart
                  </button>
                </div>

                {cartItems.map((cartItem) => (
                  <div
                    key={cartItem.id}
                    className="rounded-2xl p-6 border transition-all"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex gap-4">
                      {/* Item Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3
                              className="font-semibold text-lg mb-1"
                              style={{ color: "var(--text)" }}
                            >
                              {cartItem.foodItem.item}
                            </h3>
                            <p
                              className="text-sm"
                              style={{ color: "var(--text-subtle)" }}
                            >
                              {cartItem.foodItem.restaurant}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await removeFromCart(cartItem.id);
                              } catch (error) {
                                console.error("Failed to remove item:", error);
                                // You could show a toast notification here
                              }
                            }}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--bg-hover)";
                              e.currentTarget.style.color = "var(--error)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Nutritional Info */}
                        <div className="flex gap-4 mb-4">
                          <span
                            className="text-sm px-3 py-1 rounded-full"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--cream) 15%, transparent)",
                              color: "var(--cream)",
                            }}
                          >
                            {cartItem.foodItem.calories} cal
                          </span>
                          {cartItem.foodItem.protein && (
                            <span
                              className="text-sm px-3 py-1 rounded-full"
                              style={{
                                backgroundColor:
                                  "color-mix(in srgb, var(--success) 15%, transparent)",
                                color: "var(--success)",
                              }}
                            >
                              {cartItem.foodItem.protein}g protein
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls & Price */}
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-3 rounded-lg border px-3 py-2"
                            style={{
                              borderColor: "var(--border)",
                              backgroundColor: "var(--bg)",
                            }}
                          >
                            <button
                              onClick={() => decreaseQuantity(cartItem.id)}
                              className="p-1 rounded transition-colors"
                              style={{ color: "var(--text-subtle)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "var(--bg-hover)";
                                e.currentTarget.style.color = "var(--orange)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.color =
                                  "var(--text-subtle)";
                              }}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span
                              className="font-semibold min-w-[2rem] text-center"
                              style={{ color: "var(--text)" }}
                            >
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => increaseQuantity(cartItem.id)}
                              className="p-1 rounded transition-colors"
                              style={{ color: "var(--text-subtle)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "var(--bg-hover)";
                                e.currentTarget.style.color = "var(--orange)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.color =
                                  "var(--text-subtle)";
                              }}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div
                              className="text-xl font-bold"
                              style={{ color: "var(--cream)" }}
                            >
                              ${(cartItem.price * cartItem.quantity).toFixed(2)}
                            </div>
                            <div
                              className="text-sm"
                              style={{ color: "var(--text-muted)" }}
                            >
                              ${cartItem.price.toFixed(2)} each
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Complete Your Meal Button */}
                <button
                  onClick={handleCompleteYourMeal}
                  disabled={isLoadingSuggestions || cartItems.length === 0}
                  className="w-full py-3 rounded-full font-semibold text-base transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--orange)",
                    color: "var(--text)",
                  }}
                >
                  {isLoadingSuggestions ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    "🍔 Complete Your Meal"
                  )}
                </button>
              </div>

              {/* Right Column - Order Summary */}
              <div className="lg:col-span-1">
                <div
                  className="rounded-2xl p-6 border sticky top-24"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <h2
                    className="text-xl font-bold mb-6"
                    style={{ color: "var(--text)" }}
                  >
                    Order Summary
                  </h2>

                  <div className="space-y-4 mb-6">
                    {/* Subtotal */}
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-subtle)" }}>
                        Subtotal
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text)" }}
                      >
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Tax */}
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-subtle)" }}>
                        Tax (8%)
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text)" }}
                      >
                        ${tax.toFixed(2)}
                      </span>
                    </div>

                    {/* Delivery Fee */}
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-subtle)" }}>
                        Delivery Fee
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text)" }}
                      >
                        ${deliveryFee.toFixed(2)}
                      </span>
                    </div>

                    {/* Divider */}
                    <div
                      className="border-t pt-4"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className="text-lg font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          Total
                        </span>
                        <span
                          className="text-2xl font-bold"
                          style={{ color: "var(--cream)" }}
                        >
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={
                      isProcessing ||
                      isAuthLoading ||
                      !isAuthenticated ||
                      cartItems.length === 0
                    }
                    className="w-full py-4 rounded-full font-bold text-lg transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "var(--orange)",
                      color: "var(--text)",
                    }}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--text)]" />
                        Processing your order...
                      </span>
                    ) : !isAuthenticated ? (
                      "Log In to Place Order"
                    ) : (
                      "Place Order"
                    )}
                  </button>

                  {/* Additional Info */}
                  <div className="mt-4 text-center space-y-2">
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Free delivery on orders over $30
                    </p>
                    {!isAuthenticated && !isAuthLoading && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        <Link
                          href="/login?redirect=/cart"
                          className="underline hover:no-underline"
                          style={{ color: "var(--orange)" }}
                        >
                          Log in
                        </Link>{" "}
                        to place an order
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Combo suggestions modal */}
            {showComboModal && (
              <ComboSuggestionsModal
                suggestions={comboSuggestions}
                onClose={() => setShowComboModal(false)}
                onAddOne={async (itemId: string) => {
                  try {
                    // Find suggestion item to pass to addToCart
                    const sug = comboSuggestions.find(
                      (s) => s.item._id === itemId
                    );
                    if (!sug) return;
                    // Await the add operation before proceeding
                    await addToCart(sug.item as any, 1);
                    // Remove the added item from suggestions list
                    setComboSuggestions((prev) =>
                      prev.filter((s) => s.item._id !== itemId)
                    );
                  } catch (err) {
                    console.error("Failed to add item from suggestions:", err);
                    toast.error("Failed to add item to cart");
                  }
                }}
                onAddAll={async (items) => {
                  try {
                    await addMultipleToCart(items);
                    // Clear all suggestions after successful bulk add
                    setComboSuggestions([]);
                    setShowComboModal(false);
                  } catch (err) {
                    console.error("Failed to add all items:", err);
                    toast.error("Failed to add all items to cart");
                  }
                }}
                onApply={handleApplyPreferences}
              />
            )}

            {/* Payment modal */}
            {showPaymentModal && currentOrderId && (
              <PaymentModal
                orderId={currentOrderId}
                amount={Math.round(total * 100)} // Convert to cents
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onClose={() => setShowPaymentModal(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// (suggestions fetched inside component useEffect above)
