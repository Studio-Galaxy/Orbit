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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a high-level academic study assistant. Analyze the provided study material.
Provide an extremely detailed, in-depth summary highlighting key concepts, arguments, and conclusions. 
Also generate a large comprehensive set of study flashcards focused on critical terms and concepts.

Your entire response MUST be a valid JSON object with the following structure:
{
  "summary": "The detailed summary text here...",
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}

CRITICAL: Return ONLY the raw JSON. Do not include markdown code blocks (like \`\`\`json). Just the object.

Material to analyze:
${text}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
      
      const parsedData = JSON.parse(cleanedText.trim());
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Gemini JSON parse error:", responseText);
      return NextResponse.json({ 
        error: "AI response format was invalid.",
        raw: responseText 
      }, { status: 500 });
    }
    
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
