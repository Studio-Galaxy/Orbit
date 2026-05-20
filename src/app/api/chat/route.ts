import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const messages = body.messages;
    const contextDocs = body.contextDocs || [];

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const inlineDataParts: Record<string, unknown>[] = [];
    const contextTexts: string[] = [];

    // Optimize rate limits and context: Only fetch explicitly mentioned docs
    if (contextDocs && Array.isArray(contextDocs) && contextDocs.length > 0) {
      for (const doc of contextDocs) {
        if (doc.type === 'note' && doc.id) {
          const { data, error } = await supabase
            .from('notes')
            .select('title, content')
            .eq('id', doc.id)
            .single();
            
          if (!error && data) {
            let textContent = data.content;
            try {
              if (textContent.startsWith('{')) {
                 textContent = JSON.stringify(JSON.parse(textContent));
              }
            } catch(e) {
              // Ignore parse error
            }
            contextTexts.push(`Note Title: ${data.title}\nContent: ${textContent}`);
          }
        } else if (doc.type === 'pdf' && doc.url) {
           try {
             const res = await fetch(doc.url);
             if (res.ok) {
               const buffer = await res.arrayBuffer();
               const base64Data = Buffer.from(buffer).toString("base64");
               inlineDataParts.push({
                 inlineData: {
                   data: base64Data,
                   mimeType: "application/pdf"
                 }
               });
               contextTexts.push(`PDF Included in prompt: ${doc.label}`);
             }
           } catch (e) {
             console.error("Failed to fetch PDF", e);
           }
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const history = messages.slice(0, -1).map((msg: Record<string, unknown>) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content as string }]
    }));

    while (history.length > 0 && history[0].role !== 'user') {
      history.shift();
    }

    const lastMessage = messages[messages.length - 1].content;

    const systemPrompt = `You are the Orbit Study Assistant, an expert AI tutor. 
Your goal is to help the student understand their materials, answer questions, and provide study context. 

SPECIAL COMMANDS & STRUCTURED OUTPUT:
If the user's prompt includes "/flashcards" or explicitly asks for flashcards, respond ONLY with a strict JSON block. Format:
{
  "type": "flashcards",
  "data": [ { "question": "...", "answer": "..." } ]
}

If the user's prompt includes "/viva-voice" or asks for an oral exam, respond ONLY with a strict JSON block. Format:
{
  "type": "viva",
  "filename": "Name of the reference material (e.g. document or topic name)",
  "data": [ { "question": "...", "answer": "..." } ]
}

If the user asks you to explain a complex topic in detail, or asks for a thorough summary of a document, you should assume it's valuable and output a strict JSON block to prompt them to save it. Format: 
{
  "type": "save_note",
  "filename": "Suggested_Short_Filename",
  "explanation": "Your highly detailed, in-depth explanation or summary of the topic goes here. Use markdown bullet points and structure."
}

CRITICAL INSTRUCTION: If outputting JSON, do NOT wrap it in markdown code blocks (\`\`\`json). Return raw JSON.
If the user asks a normal question and you are not rendering one of the JSON formats above, just respond with normal text. DO NOT output JSON.

Context (Explicitly Mentioned Items by the Student):
${contextTexts.length > 0 ? contextTexts.join('\n\n---\n\n') : "No explicitly mentioned notes."}`;

    let result;
    const requestParts = [];
    
    // If we have history, we inject system prompt into the first user message
    if (history.length > 0) {
       history[0].parts[0].text = systemPrompt + "\n\n" + history[0].parts[0].text;
       const chat = model.startChat({ history: history as any });
       
       if (inlineDataParts.length > 0) {
         requestParts.push(...inlineDataParts);
       }
       requestParts.push(lastMessage);
       
       result = await chat.sendMessage(requestParts as any);
    } else {
       requestParts.push(systemPrompt + "\n\nUser Query:\n" + lastMessage);
       if (inlineDataParts.length > 0) {
         requestParts.unshift(...inlineDataParts); // Needs to be early in parts array usually
       }
       result = await model.generateContent(requestParts as any);
    }

    const responseText = result.response.text();
    return NextResponse.json({ reply: responseText });
    
  } catch (err: unknown) {
    console.error("Chat API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
