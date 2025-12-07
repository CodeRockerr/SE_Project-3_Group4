import mongoose from "mongoose";

const mealCombinationSchema = new mongoose.Schema(
  {
    mainItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FastFoodItem",
      required: true,
      index: true,
    },
    complementaryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FastFoodItem",
      required: true,
      index: true,
    },
    frequency: {
      type: Number,
      default: 0,
      index: true,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    nutritionalScore: {
      type: Number,
      default: 0,
    },
    popularity: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// compound index for quick lookup
mealCombinationSchema.index(
  { mainItemId: 1, complementaryItemId: 1 },
  { unique: true }
);

const MealCombination = mongoose.model(
  "MealCombination",
  mealCombinationSchema
);

export default MealCombination;
