import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateRecipeImage(recipeTitle) {
  try {
    const model = genAI.getGenerativeModel({
      model: "imagen-3.0-generate-002"
    });

    const prompt = `Professional food photography of ${recipeTitle}`;

    const result = await model.generateContent(prompt);

    const imageData =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!imageData) return null;

    const imageUrl = `data:image/png;base64,${imageData}`;

    return imageUrl;
  } catch (error) {
    console.error("Gemini image generation error:", error);
    return null;
  }
}
