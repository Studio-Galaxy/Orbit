import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; // Allow enough time for document analysis

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, format, action } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    // 1. Fetch the file content from the URL
    console.log("Fetching file for AI analysis:", fileUrl);
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch file: ${fileRes.status} ${fileRes.statusText}`,
        debug: `Status ${fileRes.status} for URL ${fileUrl.substring(0, 50)}...`
      }, { status: fileRes.status });
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // 3. Construct the prompt
    let promptSuffix = "";
    if (action === "summary") {
      promptSuffix = "Provide an extremely detailed, in-depth summary of this document. Outline key concepts, arguments, and conclusions using structured markdown bullet points.";
    } else if (action === "flashcards") {
      promptSuffix = "Generate a large comprehensive set of study flashcards (at least 10-15) based on the document's content. Focus on key terms, dates, formulas, and concepts.";
    } else {
      promptSuffix = "Analyze this document and provide a summary and key study points.";
    }

    const prompt = `You are a high-level academic study assistant. Analyze the provided document.
${promptSuffix}

Your entire response MUST be a valid JSON object with the following structure:
{
  "summary": "The detailed summary text here...",
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}

CRITICAL: Return ONLY the raw JSON. Do not include markdown code blocks (like \`\`\`json). Just the object.`;

    // 4. Send to Gemini with inline document data
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: getMimeType(fileUrl)
        }
      },
      prompt
    ]);

    const responseText = result.response.text();
    
    // 5. Parse and return result
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
      if (cleanedText.split("\n").pop()?.trim().startsWith("```")) {
         const lines = cleanedText.split("\n");
         lines.pop();
         cleanedText = lines.join("\n");
      }
      
      const parsedData = JSON.parse(cleanedText.trim());
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Gemini JSON parse error:", responseText);
      return NextResponse.json({ 
        error: "AI response was not in the expected format. Please try again.",
        details: responseText.substring(0, 200) + "..."
      }, { status: 500 });
    }

  } catch (err: any) {
    console.error("Analyze Doc Error:", err);
    return NextResponse.json({ 
      error: "AI engine error", 
      details: err.message || "Unknown error" 
    }, { status: 500 });
  }
}
