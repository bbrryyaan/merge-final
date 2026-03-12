import { extractTextFromImage, parseOcrText } from "../services/ocrService.js";
import { analyzeReceiptWithAi } from "../services/gemini.service.js";

/**
 * POST /api/ocr/scan
 * Accepts a multipart image upload, runs Tesseract OCR,
 * then uses Gemini AI to structure the data with legacy fallbacks.
 */
export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded." });
    }

    const rawText = await extractTextFromImage(req.file.buffer);
    console.log("[OCR] Raw Text Extracted.");

    if (!rawText || !rawText.trim()) {
      return res.status(200).json({ rawText: "", aiAnalysis: null, message: "No text detected." });
    }

    // Step 1: Use Gemini AI
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeReceiptWithAi(rawText);
      console.log("[OCR] Gemini Analysis Complete.");
    } catch (aiError) {
      console.warn("[OCR] Gemini AI failed:", aiError.message);
    }

    // Step 2: Fallback to Legacy Regex if AI results are poor/missing
    if (!aiAnalysis || (!aiAnalysis.merchant && !aiAnalysis.amount)) {
      console.log("[OCR] Using legacy regex fallback...");
      const legacyParsed = parseOcrText(rawText);
      
      aiAnalysis = {
        merchant: legacyParsed.merchant || "",
        amount: legacyParsed.amount || "",
        category: "Other", // Default to Other if AI fails
        date: new Date().toISOString().split('T')[0],
        payment_method: "Other",
        confidence_score: 0,
        isLegacyFallback: true
      };
    } else {
      // Ensure category has a value even if AI found other fields but missed category
      if (!aiAnalysis.category) aiAnalysis.category = "Other";
    }

    // Returning structured response that includes rawText for troubleshooting
    return res.status(200).json({ 
      rawText, 
      aiAnalysis,
      // Metadata for Step 6 flatten demonstration if needed
      merchant: aiAnalysis.merchant,
      amount: aiAnalysis.amount,
      category: aiAnalysis.category,
      date: aiAnalysis.date,
      payment_method: aiAnalysis.payment_method
    });

  } catch (error) {
    console.error("[OCR] Controller Error:", error.message);
    return res.status(500).json({ message: "Processing failed.", error: error.message });
  }
};
