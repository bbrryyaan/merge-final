import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Initialize Gemini AI
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Send OCR text to Gemini for structured extraction.
 * @param {string} ocrText - The raw text from Tesseract
 * @returns {Promise<Object>} - Structured JSON data
 */
export async function analyzeReceiptWithAi(ocrText) {
  try {
    const prompt = `
      You are a financial transaction parser.

      Analyze the following OCR text from a payment screenshot or receipt.
      Extract and clean the transaction information.

      Rules:
      - Correct spelling errors from OCR
      - Normalize merchant names (e.g., "ZOMATO" -> "Zomato")
      - Determine the most appropriate spending category from this list: 
        Food, Transport, Shopping, Bills, Entertainment, Groceries, Education, Other
      - Convert the amount into a clean number (remove currency symbols/commas)
      - Identify payment method (UPI, Card, Cash, Wallet)
      - Identify the date (YYYY-MM-DD format)
      - Return ONLY valid JSON in this format:
      {
        "merchant": "",
        "amount": "",
        "date": "",
        "category": "",
        "payment_method": "",
        "confidence_score": ""
      }

      OCR text:
      """
      ${ocrText}
      """
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("[Gemini Service] Raw AI Response:", text);

    // More robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }
    
    const jsonString = jsonMatch[0].trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("[Gemini Service] Processing failed:", error.message);
    throw error;
  }
}
