import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text provided for analysis" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "paste_your_key_here") {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing or invalid in .env.local" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are an expert study assistant. Analyze the provided text and output a JSON object containing:
1. "summary": A comprehensive summary of the text. If the text is short, provide a concise summary. If the text is long (multiple pages/topics), provide a detailed and in-depth summary outlining the key points using bullet points and adequate explanations.
2. "flashcards": An array of objects, where each object has a "question" (string) and an "answer" (string). Generate as many highly relevant flashcards as possible from the text.

IMPORTANT: Your entire response must be valid JSON matching the structure:
{
  "summary": "...",
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}

Make sure you do not wrap the JSON in markdown blocks (like \`\`\`json). Just return the raw JSON object.

Text to analyze:
${text}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let parsedData;
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("\`\`\`json")) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith("\`\`\`")) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith("\`\`\`")) cleanedText = cleanedText.slice(0, -3);
      
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini output", responseText);
      return NextResponse.json({ error: "AI response format was invalid." }, { status: 500 });
    }

    return NextResponse.json(parsedData);
    
  } catch (err: any) {
    console.error("Note Analysis Error:", err);
    if (err?.message?.includes("429") || err?.message?.includes("quota") || err?.status === 429) {
      return NextResponse.json({ 
        error: "Usage limit reached. Please upgrade to a Premium Plan to continue analyzing documents.",
        code: "QUOTA_EXCEEDED"
      }, { status: 429 });
    }

    return NextResponse.json({ error: err.message || "An error occurred during analysis" }, { status: 500 });
  }
}
