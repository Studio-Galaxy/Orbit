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

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Fetch the 5 most recently created/updated notes to use as context
    const { data: recentNotes, error: notesError } = await supabase
      .from('notes')
      .select('title, content')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    let contextText = "No recent notes available.";
    if (!notesError && recentNotes && recentNotes.length > 0) {
      contextText = recentNotes.map(note => {
        let textContent = note.content;
        try {
          if (textContent.startsWith('{')) {
            const parsed = JSON.parse(textContent);
            // very basic tiptap json to text extraction
            if (parsed.content) {
               textContent = JSON.stringify(parsed);
            }
          }
        } catch(e) {}
        return `Note Title: ${note.title}\nContent: ${textContent}`;
      }).join('\n\n---\n\n');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Format previous messages for Gemini
    // Gemini expects role: "user" | "model"
    let history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Gemini strictly requires the first message in history to have role 'user'.
    while (history.length > 0 && history[0].role !== 'user') {
      history.shift();
    }

    const lastMessage = messages[messages.length - 1].content;

    const systemPrompt = `You are the Orbit Study Assistant, an expert AI tutor. 
Your goal is to help the student understand their materials, answer questions, and provide study context. 
Below is the context of their most recent notes. Use this to provide contextual, relevant answers when appropriate.
Keep your responses helpful, encouraging, and highly relevant to their questions. 

Context (Most Recent Notes):
${contextText}`;

    // Combine system prompt with the first message or use it as context if history is empty
    if (history.length === 0) {
       history.push({ role: 'user', parts: [{ text: systemPrompt + "\n\nUser Query:\n" + lastMessage }] });
    } else {
       // Insert system prompt into the first user message
       const firstUser = history.find((h: any) => h.role === 'user');
       if (firstUser) {
           firstUser.parts[0].text = systemPrompt + "\n\n" + firstUser.parts[0].text;
       }
    }

    const chat = model.startChat({ history });

    let result;
    if (history.length === 0 || history[0].parts[0].text.includes(lastMessage)) {
       // We already placed the last message in the history if it was empty above
       const promptWithSys = systemPrompt + "\n\nUser Query:\n" + lastMessage;
       result = await model.generateContent(promptWithSys);
    } else {
       result = await chat.sendMessage(lastMessage);
    }

    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText });
    
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: err.message || "An error occurred" }, { status: 500 });
  }
}
