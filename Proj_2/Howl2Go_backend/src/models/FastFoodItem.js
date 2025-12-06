import mongoose from "mongoose";

const fastFoodItemSchema = new mongoose.Schema(
	{
		company: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		// legacy field used in some tests and older code: map `restaurant` -> `company`
		restaurant: {
			type: String,
			trim: true,
			select: false,
		},
		item: {
			type: String,
			required: true,
			trim: true,
		},
		calories: {
			type: Number,
			default: null,
		},
		caloriesFromFat: {
			type: Number,
			default: null,
		},
		totalFat: {
			type: Number,
			default: null,
		},
		saturatedFat: {
			type: Number,
			default: null,
		},
		transFat: {
			type: Number,
			default: null,
		},
		cholesterol: {
			type: Number,
			default: null,
		},
		sodium: {
			type: Number,
			default: null,
		},
		carbs: {
			type: Number,
			default: null,
		},
		fiber: {
			type: Number,
			default: null,
		},
		sugars: {
			type: Number,
			default: null,
		},
		protein: {
			type: Number,
			default: null,
		},
		weightWatchersPoints: {
			type: Number,
			default: null,
		},
		price: {
			type: Number,
			default: 2,
		},
		ingredients: {
			type: [String],
			default: [],
			index: true,
		},
	},
	{
		timestamps: true,
	}
);

// Create compound index for efficient querying
fastFoodItemSchema.index({ company: 1, item: 1 });

// Create text index for searching items
fastFoodItemSchema.index({ item: "text", company: "text" });

// Before validation, if tests or older fixtures provided `restaurant`, map it to `company`.
fastFoodItemSchema.pre("validate", function (next) {
	if (!this.company && this.restaurant) {
		this.company = this.restaurant;
	}
	next();
});
// Ingredient index for recommendation queries
fastFoodItemSchema.index({ ingredients: 1 });

const FastFoodItem = mongoose.model("FastFoodItem", fastFoodItemSchema);

export default FastFoodItem;
