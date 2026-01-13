
export interface AISuggestion {
    category: string;
    sub_category: string | null;
    merchant_description: string;
    confidence: number;
}

export const categorizeWithAI = async (
    description: string,
    apiKey: string
): Promise<AISuggestion | null> => {
    if (!apiKey) {
        console.warn("No API key provided for AI categorization");
        return null;
    }

    // Using Google Gemini API (flash model is good and cheap/free)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
    You are a personal finance assistant. Categorize this transaction description: "${description}".
    Return valid JSON only. Format:
    {
      "category": "Category Name",
      "sub_category": "Sub Category Name (or null)",
      "merchant_description": "Short explanation of what this merchant is",
      "confidence": 0.9 (number between 0 and 1)
    }
    Common Categories: Food, Transport, Housing, Utilities, Shopping, Entertainment, Health, Income.
  `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`AI API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) return null;

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            category: result.category || "Uncategorized",
            sub_category: result.sub_category || null,
            merchant_description: result.merchant_description || "No description available",
            confidence: result.confidence || 0
        };

    } catch (error) {
        console.error("AI Categorization failed:", error);
        return null;
    }
};
