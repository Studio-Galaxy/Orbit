"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, User, RotateCcw } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello John. I have the context of your recent Calculus notes and Machine Learning PDFs. What would you like to study today?"
    }
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          role: "assistant", 
          content: "That's a great question. Based on your notes, the partial derivative of a function with multiple variables is computed by differentiating with respect to one variable while holding the others constant. Would you like a practice problem?" 
        }
      ]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-4xl mx-auto pt-6 px-4 pb-0 items-center justify-end relative">
      {messages.length === 1 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center opacity-50 pointer-events-none">
          <Sparkles size={64} className="text-neutral-800 mb-6" />
          <h1 className="text-2xl font-semibold text-neutral-400">Orbit Study Assistant</h1>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 w-full overflow-y-auto px-2 md:px-6 w-full space-y-8 pb-10 custom-scrollbar z-10 flex flex-col justify-end">
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0">
                {msg.role === 'user' ? (
                   <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-white border border-neutral-700">
                    JS
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
                    <Sparkles size={14} />
                  </div>
                )}
              </div>
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} pt-1`}>
                <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-neutral-300'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area */}
      <div className="w-full bg-black py-6 mt-auto z-20">
        <div className="relative flex items-center w-full bg-neutral-900 border border-neutral-800 focus-within:border-neutral-600 transition-colors rounded-2xl p-2 shadow-2xl">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your notes or PDFs..."
            className="flex-1 bg-transparent border-none outline-none text-white text-sm px-4 placeholder-neutral-500"
          />
          <button 
            onClick={handleSend}
            className="p-2 ml-2 bg-white text-black hover:bg-neutral-200 transition-colors rounded-xl flex items-center justify-center disabled:opacity-50"
            disabled={!input.trim()}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="text-center mt-3">
          <span className="text-[10px] text-neutral-600">AI can make mistakes. Verify important information from your syllabus.</span>
        </div>
      </div>
    </div>
  );
}
