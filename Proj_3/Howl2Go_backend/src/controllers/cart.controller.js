import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import FastFoodItem from '../models/FastFoodItem.js';

// Helper to ensure session is marked and saved so cookies are sent to client
const saveSession = (req) => new Promise((resolve) => {
  try {
    if (req && req.session) {
      if (req.cart && req.cart._id) {
        req.session.cartId = String(req.cart._id);
      }
      if (typeof req.session.save === 'function') {
        req.session.save(() => resolve());
        return;
      }
    }
  } catch (e) {
    // ignore
  }
  resolve();
});

/**
 * Get or create cart for current session
 */
const getOrCreateCart = async (sessionId, userId = null) => {
  let cart = await Cart.findOne({ sessionId }).populate('items.foodItem');

  if (!cart) {
    cart = await Cart.create({
      sessionId,
      userId,
      items: []
    });
  } else if (userId && !cart.userId) {
    // Associate cart with user if they log in
    cart.userId = userId;
    await cart.save();
  }

  return cart;
};

/**
 * Get current cart
 * GET /api/cart
 */
export const getCart = async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const userId = req.user?.id || null;

    const cart = await getOrCreateCart(sessionId, userId);
    // Ensure session persists (attach cart to req and save session cookie)
    req.cart = cart;
    await saveSession(req);

    // Populate foodItem references
    const populatedCart = await Cart.findById(cart._id).populate('items.foodItem');

    // Normalize items for response: ensure foodItem is returned as full object when populated
    const mapItem = (it) => ({
      foodItem: it.foodItem && typeof it.foodItem === 'object' ? {
        _id: String(it.foodItem._id),
        company: it.foodItem.company,
        item: it.foodItem.item,
        calories: it.foodItem.calories,
        price: it.foodItem.price
      } : (it.foodItem ? String(it.foodItem) : it.foodItem),
      restaurant: it.restaurant,
      item: it.item,
      calories: it.calories,
      totalFat: it.totalFat,
      protein: it.protein,
      carbohydrates: it.carbohydrates,
      price: it.price,
      quantity: it.quantity
    });

    res.status(200).json({
      success: true,
      data: {
        cart: {
          id: String(populatedCart._id),
          items: populatedCart.items.map(mapItem),
          totalItems: populatedCart.totalItems,
          totalPrice: populatedCart.totalPrice,
          totalCalories: populatedCart.totalCalories,
          userId: populatedCart.userId ?? undefined
        }
      }
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add item to cart
 * POST /api/cart/items
 */
export const addItemToCart = async (req, res) => {
  try {
    const { foodItemId, quantity } = req.body;

    if (!foodItemId) {
      return res.status(400).json({
        success: false,
        message: 'Food item ID is required'
      });
    }

    // Validate ObjectId format first
    if (!mongoose.Types.ObjectId.isValid(foodItemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid food item ID'
      });
    }

    // Require quantity to be explicitly provided for POST
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required'
      });
    }

    const parsedQty = parseInt(quantity, 10);
    if (Number.isNaN(parsedQty) || parsedQty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    // Verify food item exists
    const foodItem = await FastFoodItem.findById(foodItemId);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    const sessionId = req.sessionID;
    const userId = req.user?.id || null;

    console.log('[CartController] addItemToCart called', { sessionId, userId, foodItemId, quantity });

    const cart = await getOrCreateCart(sessionId, userId);
    // persist session
    req.cart = cart;
    await saveSession(req);

    console.log('[CartController] got cart', { cartId: cart._id, itemsBefore: cart.items.length });

    // Calculate price based on calories if not provided
    const calculatePrice = (calories) => {
      if (!calories || calories <= 0) return 2.0;
      const basePrice = calories * 0.01;
      return Math.min(Math.max(basePrice, 2.0), 15.0);
    };

    // Add item with all necessary data
    // Use calorie-based price calculation when item has no explicit price
    await cart.addItem({
      foodItem: foodItemId,
      restaurant: foodItem.company,
      item: foodItem.item,
      calories: foodItem.calories || 0,
      totalFat: foodItem.totalFat || 0,
      protein: foodItem.protein || 0,
      carbohydrates: foodItem.carbs || 0,
      price: (typeof foodItem.price === 'number' ? foodItem.price : calculatePrice(foodItem.calories)),
      quantity: parsedQty
    });

    const refreshed = await Cart.findById(cart._id).populate('items.foodItem');
    console.log('[CartController] updated cart after addItem', { id: refreshed._id, totalItems: refreshed.totalItems, items: refreshed.items.length });
    // Reload cart with populated items
    const updatedCart = await Cart.findById(cart._id).populate('items.foodItem');

    // Normalize items for response: ensure foodItem is returned as full object when populated
    const mapItem = (it) => ({
      foodItem: it.foodItem && typeof it.foodItem === 'object' ? {
        _id: String(it.foodItem._id),
        company: it.foodItem.company,
        item: it.foodItem.item,
        calories: it.foodItem.calories,
        price: it.foodItem.price
      } : (it.foodItem ? String(it.foodItem) : it.foodItem),
      restaurant: it.restaurant,
      item: it.item,
      calories: it.calories,
      totalFat: it.totalFat,
      protein: it.protein,
      carbohydrates: it.carbohydrates,
      price: it.price,
      quantity: it.quantity
    });

    // Also ensure any nested populated objects are converted to id strings inside save hooks or mapping
    const normalizedItems = updatedCart.items.map(mapItem);

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: {
        cart: {
          id: String(updatedCart._id),
          items: normalizedItems,
          totalItems: updatedCart.totalItems,
          totalPrice: updatedCart.totalPrice,
          totalCalories: updatedCart.totalCalories,
          userId: updatedCart.userId ?? undefined
        }
      }
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add multiple items to cart in bulk
 * POST /api/cart/items/bulk
 */
export const addItemsToCart = async (req, res) => {
  try {
    const { items } = req.body; // items should be an array of { foodItemId, quantity }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const userId = req.user?.id ?? undefined;
    const sessionId = req.sessionID;

    let cart = await Cart.findOne(userId ? { userId } : { sessionId }).populate('items.foodItem');
    
    if (!cart) {
      cart = new Cart({
        userId,
        sessionId,
        items: []
      });
    }

    // Process each item
    for (const item of items) {
      const { foodItemId, quantity } = item;
      
      if (!foodItemId || !quantity || quantity <= 0) {
        continue; // Skip invalid items
      }

      const foodItem = await FastFoodItem.findById(foodItemId);
      if (!foodItem) {
        continue; // Skip items not found
      }

      const existingItem = cart.items.find(
        (it) => String(it.foodItem._id || it.foodItem) === String(foodItemId)
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({
          foodItem: foodItemId,
          quantity,
          company: foodItem.company,
          item: foodItem.item,
          calories: foodItem.calories,
          totalFat: foodItem.totalFat,
          protein: foodItem.protein,
          carbohydrates: foodItem.carbs,
          price: foodItem.price
        });
      }
    }

    const updatedCart = await cart.save();
    await updatedCart.populate('items.foodItem');

    const normalizedItems = updatedCart.items.map(mapItem);

    res.status(200).json({
      success: true,
      message: `${items.length} items added to cart`,
      data: {
        cart: {
          id: String(updatedCart._id),
          items: normalizedItems,
          totalItems: updatedCart.totalItems,
          totalPrice: updatedCart.totalPrice,
          totalCalories: updatedCart.totalCalories,
          userId: updatedCart.userId ?? undefined
        }
      }
    });
  } catch (error) {
    console.error('Error adding items to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add items to cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update item quantity in cart
 * PATCH /api/cart/items/:foodItemId
 */
export const updateCartItemQuantity = async (req, res) => {
  try {
    const { foodItemId } = req.params;
    const { quantity } = req.body;

    // Allow quantity === 0 so that tests can remove items by setting quantity to 0.
    if (quantity === undefined || quantity === null || isNaN(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    const sessionId = req.sessionID;
    const cart = await Cart.findOne({ sessionId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    // persist session
    req.cart = cart;
    await saveSession(req);
    await cart.updateItemQuantity(foodItemId, parseInt(quantity, 10));

    // Reload cart with populated items
    const updatedCart = await Cart.findById(cart._id).populate('items.foodItem');

    const mapItem = (it) => ({
      foodItem: it.foodItem && typeof it.foodItem === 'object' ? {
        _id: String(it.foodItem._id),
        company: it.foodItem.company,
        item: it.foodItem.item,
        calories: it.foodItem.calories,
        price: it.foodItem.price
      } : (it.foodItem ? String(it.foodItem) : it.foodItem),
      restaurant: it.restaurant,
      item: it.item,
      calories: it.calories,
      totalFat: it.totalFat,
      protein: it.protein,
      carbohydrates: it.carbohydrates,
      price: it.price,
      quantity: it.quantity
    });

    res.status(200).json({
      success: true,
      message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
      data: {
        cart: {
          id: updatedCart._id,
          items: updatedCart.items.map(mapItem),
          totalItems: updatedCart.totalItems,
          totalPrice: updatedCart.totalPrice
        }
      }
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove item from cart
 * DELETE /api/cart/items/:foodItemId
 */
export const removeItemFromCart = async (req, res) => {
  try {
    const { foodItemId } = req.params;

    const sessionId = req.sessionID;
    const cart = await Cart.findOne({ sessionId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    req.cart = cart;
    await saveSession(req);
    await cart.removeItem(foodItemId);

    // Reload cart with populated items
    const updatedCart = await Cart.findById(cart._id).populate('items.foodItem');

    const mapItem = (it) => ({
      foodItem: it.foodItem && typeof it.foodItem === 'object' ? {
        _id: String(it.foodItem._id),
        company: it.foodItem.company,
        item: it.foodItem.item,
        calories: it.foodItem.calories,
        price: it.foodItem.price
      } : (it.foodItem ? String(it.foodItem) : it.foodItem),
      restaurant: it.restaurant,
      item: it.item,
      calories: it.calories,
      totalFat: it.totalFat,
      protein: it.protein,
      carbohydrates: it.carbohydrates,
      price: it.price,
      quantity: it.quantity
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cart: {
          id: updatedCart._id,
          items: updatedCart.items.map(mapItem),
          totalItems: updatedCart.totalItems,
          totalPrice: updatedCart.totalPrice
        }
      }
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove cart item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Clear cart
 * DELETE /api/cart
 */
export const clearCart = async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const cart = await Cart.findOne({ sessionId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    req.cart = cart;
    await saveSession(req);
    await cart.clearCart();

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: {
        cart: {
          id: cart._id,
          items: [],
          totalItems: 0,
          totalPrice: 0
        }
      }
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Merge guest cart with user cart on login
 * POST /api/cart/merge
 */
export const mergeCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const sessionId = req.sessionID;
    const userId = req.user.id;

    // Get session cart (guest cart)
    const sessionCart = await Cart.findOne({ sessionId });

    // Get user's existing cart
    let userCart = await Cart.findOne({ userId, sessionId: { $ne: sessionId } });

    if (sessionCart && sessionCart.items.length > 0) {
      if (userCart) {
        // Merge session cart items into user cart
        for (const item of sessionCart.items) {
          await userCart.addItem(item);
        }
        // Delete session cart
        await Cart.deleteOne({ _id: sessionCart._id });
      } else {
        // Just associate session cart with user
        sessionCart.userId = userId;
        await sessionCart.save();
        userCart = sessionCart;
      }
    } else if (!userCart) {
      // Create new cart for user
      userCart = await Cart.create({
        sessionId,
        userId,
        items: []
      });
    }

    // Persist session association
    req.cart = sessionCart || userCart;
    await saveSession(req);

    // Reload cart with populated items
    const finalCart = await Cart.findById(userCart._id).populate('items.foodItem');

    const mapItem = (it) => ({
      foodItem: it.foodItem && typeof it.foodItem === 'object' ? {
        _id: String(it.foodItem._id),
        company: it.foodItem.company,
        item: it.foodItem.item,
        calories: it.foodItem.calories,
        price: it.foodItem.price
      } : (it.foodItem ? String(it.foodItem) : it.foodItem),
      restaurant: it.restaurant,
      item: it.item,
      calories: it.calories,
      totalFat: it.totalFat,
      protein: it.protein,
      carbohydrates: it.carbohydrates,
      price: it.price,
      quantity: it.quantity
    });

    res.status(200).json({
      success: true,
      message: 'Cart merged successfully',
      data: {
        cart: {
          id: finalCart._id,
          items: finalCart.items.map(mapItem),
          totalItems: finalCart.totalItems,
          totalPrice: finalCart.totalPrice
        }
      }
    });
  } catch (error) {
    console.error('Error merging cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
