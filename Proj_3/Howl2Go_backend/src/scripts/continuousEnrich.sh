#!/bin/bash

# Continuous enrichment script - runs multiple cycles with delays
# This will gradually enrich all items while respecting rate limits

echo "🚀 Starting continuous ingredient enrichment..."
echo "Up to 50 cycles, processing only remaining items (no reprocessing)"
echo "Each cycle ~2–3 minutes depending on remaining items"
echo ""

for i in {1..50}
do
        echo "========================================"
        echo "🔄 Starting enrichment cycle $i/50"
        echo "========================================"

        # Check remaining items (<10 ingredients)
        # Remaining as a clean integer (strip any non-digit logs)
                                remaining=$(
                                        node -e '
            require("dotenv").config();
            const mongoose=require("mongoose");
            mongoose.connect(process.env.MONGODB_URI).then(async()=>{
                const FastFoodItem=mongoose.model("FastFoodItem", new (require("mongoose").Schema)({}, {strict:false}));
                const stats=await FastFoodItem.aggregate([
                    { $project:{ ingredientCount:{ $size:{ $ifNull:["$ingredients",[]] } } } },
                    { $group:{ _id:null, remaining:{ $sum:{ $cond:[{ $lt:["$ingredientCount",10] },1,0] } } } }
                ]);
                console.log(String(stats[0]?.remaining ?? 0));
                process.exit(0);
            }).catch(e=>{ process.stdout.write("0"); process.exit(0); });
                                        ' 2>/dev/null | grep -E '^[0-9]+$' | tail -1
                                )
                                if [ -z "$remaining" ]; then remaining=0; fi

        if [ "$remaining" -eq 0 ]; then
                echo "🎉 No remaining items to enrich. Exiting early."
                break
        fi

        echo "Remaining items to enrich: $remaining"
        node src/scripts/enrichIngredientsWithLLM.js

        echo ""
        echo "✅ Cycle $i complete. Waiting 2 minutes before next cycle..."
        echo ""

        # Wait 2 minutes between cycles to be safe with rate limits
        if [ $i -lt 50 ]; then
                sleep 120
        fi
done

echo "🎉 Enrichment loop finished."
