import connectDB from "../config/database.js";
import FastFoodItem from "../models/FastFoodItem.js";
import MealCombination from "../models/MealCombination.js";
import config from "../config/env.js";

/**
 * Seed a small set of popular meal combinations into MealCombination collection.
 * Run with: node src/scripts/seedMealCombos.js
 */
const seedPairs = [
  { main: "burger", comp: "fries", freq: 500 },
  { main: "burger", comp: "cola", freq: 420 },
  { main: "burger", comp: "milkshake", freq: 120 },
  { main: "pizza", comp: "cola", freq: 480 },
  { main: "pizza", comp: "bread", freq: 90 },
  { main: "chicken", comp: "fries", freq: 300 },
  { main: "salad", comp: "bread", freq: 70 },
  { main: "taco", comp: "soda", freq: 210 },
];

const findItemByPartial = async (text) => {
  if (!text) return null;
  // Try exact text match first then fallback to regex on item field
  let item = await FastFoodItem.findOne({ item: new RegExp(`^${text}$`, "i") });
  if (item) return item;
  item = await FastFoodItem.findOne({ item: new RegExp(text, "i") });
  if (item) return item;
  // fallback search by company name (if text is a brand)
  item = await FastFoodItem.findOne({ company: new RegExp(text, "i") });
  return item;
};

const upsertCombo = async (mainItemId, complementaryItemId, freq) => {
  if (!mainItemId || !complementaryItemId) return null;
  const update = {
    $inc: { frequency: freq },
    $set: { updatedAt: new Date() },
  };

  const options = { upsert: true, new: true, setDefaultsOnInsert: true };

  const doc = await MealCombination.findOneAndUpdate(
    { mainItemId, complementaryItemId },
    update,
    options
  );

  // recompute popularity as frequency for now
  if (doc) {
    doc.popularity = doc.frequency;
    await doc.save();
  }

  return doc;
};

const run = async () => {
  console.log("Connecting to DB...");
  await connectDB();

  console.log("Seeding meal combinations...");

  for (const pair of seedPairs) {
    const main = await findItemByPartial(pair.main);
    const comp = await findItemByPartial(pair.comp);

    if (!main || !comp) {
      console.warn(
        `Could not find match for pair: ${pair.main} -> ${
          pair.comp
        } (main:${!!main}, comp:${!!comp})`
      );
      continue;
    }

    const doc = await upsertCombo(main._id, comp._id, pair.freq);
    if (doc) {
      console.log(
        `Upserted combo: ${main.item} -> ${comp.item} (freq +${pair.freq})`
      );
    }
  }

  console.log("Seeding complete. Sample combos:");
  const samples = await MealCombination.find()
    .limit(10)
    .populate("mainItemId complementaryItemId")
    .lean();
  samples.forEach((s) => {
    console.log(
      `- ${s.mainItemId?.item || s.mainItemId} -> ${
        s.complementaryItemId?.item || s.complementaryItemId
      } (freq=${s.frequency})`
    );
  });

  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
