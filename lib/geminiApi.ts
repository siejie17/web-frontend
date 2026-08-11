import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
});

const modelQueue = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];

export async function sendMessageToGemini(message: string): Promise<string> {
  for (const modelName of modelQueue) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: message,
      });

      return response.text!;
    } catch (error) {
      const is503Error =
        (error as any)?.status === "UNAVAILABLE" ||
        (error as any)?.toString?.()?.includes("503") ||
        (error as any)?.toString?.()?.includes("high demand");

      if (is503Error && modelName !== modelQueue[modelQueue.length - 1]) {
        console.warn(`Model ${modelName} overloaded (503). Falling back...`);
        continue;
      }

      console.error(`Gemini API Error on ${modelName}:`, error);
      throw error;
    }
  }
}
