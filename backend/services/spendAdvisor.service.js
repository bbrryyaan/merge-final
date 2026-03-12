import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * AI Spend Advisor Service
 * Recommends the best local options based on user budget and business data.
 */
export async function getAiSpendRecommendation({ category, itemName, budget, places, budgetContext }) {
  try {
    const prompt = `
      You are a Financial Advisor helping users choose the most affordable local options.
      Your goal is to select the BEST option that stays within the user's real-time financial limits.

      User Financial Context (Real Data):
      - Weekly ${category} Budget: ${budgetContext.currency}${budgetContext.weekly_category_limit}
      - Already Spent this week: ${budgetContext.currency}${budgetContext.category_spent_this_week}
      - Remaining Capacity: ${budgetContext.currency}${budgetContext.remaining_category_budget}

      User Purchase Request:
      - Item/Service: ${itemName}
      - Target Price for this item: ${budgetContext.currency}${budget}

      Nearby Business Options (data includes travel_cost and total_cost):
      ${JSON.stringify(places, null, 2)}

      Selection Criteria:
      1. MUST check if the "total_cost" fits within the "Remaining Capacity" (${budgetContext.currency}${budgetContext.remaining_category_budget}).
      2. If all options exceed remaining capacity, warn the user and suggest the absolute cheapest proximity-wise.
      3. Prefer options with lowest total cost and high ratings.
      4. Shortest distance is a priority to minimize travel cost.

      Tasks:
      1. Analyze the options based on the criteria.
      2. Return ONLY a JSON object with this exact structure:
      {
        "best_choice": "Name of the recommended place",
        "reason": "Clear financial reasoning for the choice",
        "recommendedPlaceId": "id of the best place",
        "savingsTip": "a smart tip to save more on this category",
        "aiBadge": "a short funny/catchy tag for the choice (e.g. 'Financial Hero', 'Savings Pro')"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // More robust clean up of markdown JSON blocks
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in Gemini response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[SpendAdvisor Service] AI logic failed:", error);
    // Dynamic fallback
    const bestBet = places[0];
    return {
      recommendedPlaceId: bestBet?.id,
      best_choice: bestBet?.name || "Local Option",
      reason: bestBet ? `This shop has the lowest total cost (₹${bestBet.total_cost}) considering both the item and your travel distance.` : "Based on distance and rating, this looks like your best bet.",
      savingsTip: "Check for student or bulk discounts in this category.",
      aiBadge: "Financial Hero"
    };
  }
}
