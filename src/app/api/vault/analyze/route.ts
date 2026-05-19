import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  
  return 'application/octet-stream';
}

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using 1.5 flash for docs

    const prompt = `You are an expert document parser. Your goal is to extract ALL textual content from this document. 
Preserve formatting, headings, and structure as much as possible using clean markdown.
Do NOT summarize or analyze the document, just extract the entire textual content exactly as it is represented, adding markdown headers where appropriate. Do not wrap with \`\`\`markdown, just return the text.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: getMimeType(file.name)
        }
      },
      prompt
    ]);
    const responseText = result.response.text();

    return NextResponse.json({ text: responseText.trim() });
    
  } catch (err: any) {
    console.error("Vault Analysis Error:", err);
    // If we hit a 429 Too Many Requests or quota error
    if (err?.message?.includes("429") || err?.message?.includes("quota") || err?.status === 429) {
      return NextResponse.json({ 
        error: "Usage limit reached. Please upgrade to a Premium Plan to continue extracting documents.",
        code: "QUOTA_EXCEEDED"
      }, { status: 429 });
    }

    return NextResponse.json({ error: err.message || "An error occurred during extraction" }, { status: 500 });
  }
}
