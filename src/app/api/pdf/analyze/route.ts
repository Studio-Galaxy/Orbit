import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "paste_your_key_here") {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing or invalid in .env.local" }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are an expert study assistant. Analyze the provided document and output a JSON object containing:
1. "summary": A concise and comprehensive summary of the document (2-3 sentences max).
2. "flashcards": An array of objects, where each object has a "question" (string) and an "answer" (string). Generate exactly 5 highly relevant flashcards based on the material.
3. "quiz": An array of objects, where each object has a "question" (string), "options" (an array of exactly 4 strings), and "answer" (string, must exactly match one of the options). Generate exactly 5 quiz questions.

IMPORTANT: Your entire response must be valid JSON matching the structure:
{
  "summary": "...",
  "flashcards": [
    { "question": "...", "answer": "..." }
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}

Make sure you do not wrap the JSON in markdown blocks (like \`\`\`json). Just return the raw JSON object.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf"
        }
      },
      prompt
    ]);
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
    console.error("PDF Analysis Error:", err);
    // If we hit a 429 Too Many Requests or quota error
    if (err?.message?.includes("429") || err?.message?.includes("quota") || err?.status === 429) {
      console.log("API rate limit/quota reached.");
      return NextResponse.json({ 
        error: "Usage limit reached. Please upgrade to a Premium Plan to continue analyzing documents.",
        code: "QUOTA_EXCEEDED"
      }, { status: 429 });
    }

    return NextResponse.json({ error: err.message || "An error occurred during analysis" }, { status: 500 });
  }
}
