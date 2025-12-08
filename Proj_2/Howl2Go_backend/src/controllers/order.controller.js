import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import FastFoodItem from '../models/FastFoodItem.js';
import {
  analyzeNutritionPatterns,
  trackDietaryTrends,
  generatePersonalizedRecommendations
} from '../services/orderAnalytics.js';

/**
 * Create order from cart
 * POST /api/orders
 */
export const createOrder = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    // Align with cart controller which uses req.sessionID
    const sessionId = req.sessionID || req.session?.id;
    const cartId = req.session?.cartId;

    console.log('[OrderController] lookup cart', { userId, sessionId, cartId });

    // Lookup carts separately so we can prefer the one with items
    const userCart = await Cart.findOne({ userId });
    const sessionCart = sessionId ? await Cart.findOne({ sessionId }) : null;
    const sessionStoredCart = (!sessionCart && cartId) ? await Cart.findById(cartId) : null;

    console.log('[OrderController] carts found', {
      userCartId: userCart?._id,
      userCartItems: userCart?.items?.length,
      sessionCartId: sessionCart?._id,
      sessionCartItems: sessionCart?.items?.length,
      sessionStoredCartId: sessionStoredCart?._id,
      sessionStoredCartItems: sessionStoredCart?.items?.length,
    });

    // Prefer session cart if it has items; otherwise fall back to user cart, then stored cart
    let cart = null;
    if (sessionCart && Array.isArray(sessionCart.items) && sessionCart.items.length > 0) {
      cart = sessionCart;
    } else if (userCart && Array.isArray(userCart.items) && userCart.items.length > 0) {
      cart = userCart;
    } else if (sessionStoredCart && Array.isArray(sessionStoredCart.items) && sessionStoredCart.items.length > 0) {
      cart = sessionStoredCart;
    } else {
      // If none have items, pick sessionCart first, then userCart, then storedCart (may be empty) to allow clear error/logging
      cart = sessionCart || userCart || sessionStoredCart;
    }

    if (cart) {
      console.log('[OrderController] selected cart', { cartId: cart._id, items: cart.items?.length, sessionId: cart.sessionId, userId: cart.userId });
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      console.warn('[OrderController] cart missing or empty', { userId, sessionId, cartId });
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Populate cart items with full food item data
    const populatedCart = await Cart.findById(cart._id).populate('items.foodItem');
    
    console.log('[OrderController] Cart items before populate:', JSON.stringify(cart.items.map(i => ({ 
      foodItem: i.foodItem, 
      foodItemType: typeof i.foodItem,
      item: i.item 
    }))));
    console.log('[OrderController] Cart items after populate:', JSON.stringify(populatedCart?.items.map(i => ({ 
      foodItem: i.foodItem?._id || i.foodItem, 
      foodItemType: typeof i.foodItem,
      isNull: i.foodItem === null,
      item: i.item 
    }))));
    
    // Ensure items are populated
    if (!populatedCart || !populatedCart.items || populatedCart.items.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Cart is empty'
            });
          }

          // Clean up any items with null foodItem references
          const invalidItems = populatedCart.items.filter(item => !item.foodItem);
          if (invalidItems.length > 0) {
            console.warn(`[OrderController] Found ${invalidItems.length} invalid cart items, cleaning up...`, {
              cartId: populatedCart._id,
              sessionId: populatedCart.sessionId,
              userId: populatedCart.userId
            });
            // Remove invalid items from cart
            populatedCart.items = populatedCart.items.filter(item => item.foodItem);
            await populatedCart.save();
      
            // If all items were invalid, return error
            if (populatedCart.items.length === 0) {
              return res.status(400).json({
                success: false,
                message: 'Cart contains invalid items. Please refresh and try again.'
              });
            }
          }
    
          // Ensure items are still valid after cleanup
          if (!populatedCart.items || populatedCart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate totals from populatedCart to ensure fresh data
    const subtotal = populatedCart.totalPrice || cart.totalPrice || 0;
    const tax = subtotal * 0.08; // 8% tax
    const deliveryFee = subtotal > 30 ? 0 : 3.99;
    const total = subtotal + tax + deliveryFee;
    
    // Create order from cart items with full nutrition data
    if (!Array.isArray(populatedCart.items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart items'
      });
    }

    const orderItems = await Promise.all(
      populatedCart.items.map(async (item) => {
        // Get full nutrition data from FastFoodItem if available
        let fullNutrition = {};
        let foodItemId = null;
        
        // Extract foodItem ID - handle both populated and non-populated cases
        if (item.foodItem) {
          if (typeof item.foodItem === 'object' && item.foodItem._id) {
            foodItemId = item.foodItem._id;
            const foodItem = await FastFoodItem.findById(foodItemId).lean();
            if (foodItem) {
              fullNutrition = {
                calories: foodItem.calories || item.calories || 0,
                totalFat: foodItem.totalFat || item.totalFat || null,
                saturatedFat: foodItem.saturatedFat || null,
                transFat: foodItem.transFat || null,
                protein: foodItem.protein || item.protein || null,
                carbohydrates: foodItem.carbs || item.carbohydrates || null,
                fiber: foodItem.fiber || null,
                sugars: foodItem.sugars || null,
                sodium: foodItem.sodium || null,
                cholesterol: foodItem.cholesterol || null,
              };
            }
          } else {
            // foodItem is just an ID string/ObjectId
            foodItemId = item.foodItem;
          }
        }
        
        // If foodItemId is still null, this item is invalid - skip it
        if (!foodItemId) {
          console.warn('Skipping cart item with missing foodItem:', item);
          return null;
        }

        return {
          foodItem: foodItemId,
          restaurant: item.restaurant || '',
          item: item.item || '',
          calories: fullNutrition.calories || item.calories || 0,
          totalFat: fullNutrition.totalFat || item.totalFat || null,
          saturatedFat: fullNutrition.saturatedFat || null,
          transFat: fullNutrition.transFat || null,
          protein: fullNutrition.protein || item.protein || null,
          carbohydrates: fullNutrition.carbohydrates || item.carbohydrates || null,
          fiber: fullNutrition.fiber || null,
          sugars: fullNutrition.sugars || null,
          sodium: fullNutrition.sodium || null,
          cholesterol: fullNutrition.cholesterol || null,
          price: item.price,
          quantity: item.quantity
        };
      })
    );
    
    // Filter out any null items (items with invalid foodItem references)
    const validOrderItems = orderItems.filter(item => item !== null);
    
    // Check if we have any valid items
    if (validOrderItems.length === 0) {
      console.warn('[OrderController] No valid items after filtering', { cartId: populatedCart._id });
      return res.status(400).json({
        success: false,
        message: 'No valid items in cart to create order'
      });
    }

    // Generate unique order number
    let orderNumber;
    let isUnique = false;
    
    while (!isUnique) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      orderNumber = `ORD-${timestamp}-${random}`;
      
      // Check if this orderNumber already exists
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) {
        isUnique = true;
      }
    }

    // Create order
    const order = await Order.create({
      userId,
      orderNumber,
      items: validOrderItems,
      subtotal,
      tax,
      deliveryFee,
      total,
      status: 'completed'
    });

    // Clear cart after order is created
    await cart.clearCart();

    // Populate food items for response
    const populatedOrder = await Order.findById(order._id)
      .populate('items.foodItem')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order: populatedOrder
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's order history
 * GET /api/orders
 */
export const getOrderHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const { limit = 20, page = 1, timeRange = 'all' } = req.query;

    // Ensure userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Build query
    const query = {
      userId: new mongoose.Types.ObjectId(userId),
      status: 'completed'
    };

    // Build date filter if needed
    if (timeRange !== 'all') {
      const now = new Date();
      switch (timeRange) {
        case 'week':
          query.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
          break;
        case 'month':
          query.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
          break;
        case 'year':
          query.createdAt = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
          break;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('items.foodItem')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single order by ID
 * GET /api/orders/:orderId
 */
export const getOrderById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { orderId } = req.params;
    const userId = req.user.id;

    // First check if order exists (regardless of ownership)
    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Now check ownership
    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this order'
      });
    }

    // Populate and return the order
    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodItem')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        order: populatedOrder
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get order insights and analytics
 * GET /api/orders/insights
 */
export const getOrderInsights = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const { timeRange = 'all', period = 'month' } = req.query;

    // Get nutrition patterns
    const patterns = await analyzeNutritionPatterns(userId, timeRange);

    // Get dietary trends
    const trends = await trackDietaryTrends(userId, period);

    // Get personalized recommendations
    const recommendations = await generatePersonalizedRecommendations(userId);

    res.status(200).json({
      success: true,
      data: {
        patterns,
        trends,
        recommendations
      }
    });
  } catch (error) {
    console.error('Error fetching order insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

