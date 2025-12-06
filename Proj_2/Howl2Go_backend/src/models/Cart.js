import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  foodItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FastFoodItem',
    required: true
  },
  restaurant: {
    type: String,
    required: true
  },
  item: {
    type: String,
    required: true
  },
  calories: {
    type: Number,
    required: true
  },
  totalFat: Number,
  protein: Number,
  carbohydrates: Number,
  price: {
    type: Number,
    required: true,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalCalories: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: { expires: 0 } // TTL index - MongoDB will automatically delete expired carts
  }
}, {
  timestamps: true
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.totalCalories = this.items.reduce((sum, item) => sum + ((item.calories || 0) * item.quantity), 0);
  next();
});

// Methods
cartSchema.methods.addItem = function(itemData) {
  const incomingId = itemData && itemData.foodItem && itemData.foodItem._id ? String(itemData.foodItem._id) : String(itemData.foodItem);
  const existingItemIndex = this.items.findIndex(
    (item) => {
      const existingId = item.foodItem && item.foodItem._id ? String(item.foodItem._id) : String(item.foodItem);
      return existingId === incomingId;
    }
  );

  if (existingItemIndex > -1) {
    // Update quantity if item already exists
    const addQty = itemData.quantity || 1;
    this.items[existingItemIndex].quantity += addQty;
    // If price provided in incoming data, prefer explicit price when set
    if (typeof itemData.price === 'number') {
      this.items[existingItemIndex].price = itemData.price;
    }
  } else {
    // Add new item
    this.items.push({
      ...itemData,
      quantity: itemData.quantity || 1,
      price: typeof itemData.price === 'number' ? itemData.price : 0
    });
  }

  return this.save();
};

cartSchema.methods.removeItem = function(foodItemId) {
  const fid = String(foodItemId);
  this.items = this.items.filter(
    (item) => String(item.foodItem) !== fid
  );
  return this.save();
};

cartSchema.methods.updateItemQuantity = function(foodItemId, quantity) {
  const fid = String(foodItemId);
  const item = this.items.find(
    (it) => String(it.foodItem) === fid
  );

  if (item) {
    if (quantity <= 0) {
      return this.removeItem(foodItemId);
    }
    item.quantity = quantity;
    return this.save();
  }

  throw new Error('Item not found in cart');
};

cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
