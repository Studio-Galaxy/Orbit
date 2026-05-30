"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Trash2, Command, MessageSquare, Loader2, Minus, User, Save, ArrowRight, FileBox, FileText } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const COMMANDS = [
  { id: "summarize", label: "/summarize", desc: "Summarize notes or PDFs" },
  { id: "flashcards", label: "/flashcards", desc: "Generate flashcards from context" },
  { id: "viva-voice", label: "/viva-voice", desc: "Generate oral exam questions" },
];

const TOOL_COMMANDS = [
  { id: "merge-pdf", label: "#merge-pdf", desc: "Merge @PDFs into one" },
  { id: "edit-pdf", label: "#edit-pdf", desc: "Edit @PDF details" },
  { id: "compress-pdf", label: "#compress-pdf", desc: "Shrink @PDF size" },
  { id: "pdf-to-image", label: "#pdf-to-image", desc: "JPGs from @PDF" },
  { id: "image-to-pdf", label: "#image-to-pdf", desc: "Images to PDF" },
  { id: "word-to-pdf", label: "#word-to-pdf", desc: "Word to PDF" },
];

const CodeBlock = ({ className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const inline = !className;

  return !inline ? (
    <div className="rounded-xl overflow-hidden border border-neutral-800 my-4 shadow-lg">
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          backgroundColor: '#0a0a0a',
          fontSize: '12px',
        }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className="bg-neutral-800 text-indigo-300 px-1.5 py-0.5 rounded text-[12px] font-medium" {...props}>
      {children}
    </code>
  );
};

export function AssistantPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'mobile' | 'mac'>('mobile');
  const [availableDocs, setAvailableDocs] = useState<{type: string, id: string, label: string, url?: string}[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const viewPref = localStorage.getItem("orbit-assistant-view");
    if (viewPref === 'mac') setViewMode('mac');

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        
        // Fetch docs for intelligent context
        const fetchDocs = async () => {
          const { data: notesData } = await supabase.from('notes').select('id, title').eq('user_id', data.user!.id);
          const { data: vaultData } = await supabase.from('vault_files').select('id, filename, file_url').eq('user_id', data.user!.id);
          const docs: any[] = [];
          if (notesData) notesData.forEach(n => docs.push({ type: 'note', id: n.id, label: n.title }));
          if (vaultData) vaultData.forEach(v => docs.push({ type: 'pdf', id: v.id, label: v.filename, url: v.file_url }));
          setAvailableDocs(docs);
        };
        fetchDocs();
      }
    });

    const saved = localStorage.getItem("orbit-assistant-popup-messages");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages([{ id: "1", role: "assistant", content: "Hi! I'm your Orbit Assistant. How can I help you today?" }]);
      }
    } else {
      setMessages([{ id: "1", role: "assistant", content: "Hi! I'm your Orbit Assistant. How can I help you today?" }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("orbit-assistant-popup-messages", JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const lastWord = input.split(' ').pop() || "";
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setShowCommands(false);
      setShowTools(false);
      setFilterText(lastWord.slice(1).toLowerCase());
      setSelectedIndex(0);
    } else if (lastWord.startsWith('/')) {
      setShowCommands(true);
      setShowMentions(false);
      setShowTools(false);
      setFilterText(lastWord.slice(1).toLowerCase());
      setSelectedIndex(0);
    } else if (lastWord.startsWith('#')) {
      setShowTools(true);
      setShowMentions(false);
      setShowCommands(false);
      setFilterText(lastWord.slice(1).toLowerCase());
      setSelectedIndex(0);
    } else {
      setShowMentions(false);
      setShowCommands(false);
      setShowTools(false);
    }
  }, [input]);

  const filteredDocs = availableDocs.filter(d => d.label?.toLowerCase().includes(filterText)).slice(0, 5);
  const filteredCommands = COMMANDS.filter(c => c.label.toLowerCase().includes(filterText)).slice(0, 5);
  const filteredTools = TOOL_COMMANDS.filter(t => t.label.toLowerCase().includes(filterText)).slice(0, 5);

  const insertCompletion = (text: string) => {
    const words = input.split(' ');
    words.pop();
    words.push(text + " ");
    setInput(words.join(' '));
    setShowMentions(false);
    setShowCommands(false);
    setShowTools(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Scan for mentions to send explicit context
    const mentionedDocs = availableDocs.filter(doc => input.includes(`@${doc.label}`));

    const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          contextDocs: mentionedDocs
        }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: typeof data.reply === 'string' ? data.reply : JSON.stringify(data.reply) }]);
      } else {
        throw new Error(data.error || "No reply returned");
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I ran into an error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const saveNoteToDatabase = async (parsed: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from('notes').insert({
      user_id: user.id,
      title: parsed.filename || "AI Generated Note",
      content: (parsed.content || parsed.explanation || "").replace(/\n/g, '<br/>')
    });

    if (error) throw error;
  };

  const renderMessageContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);

      if (parsed.type === 'save_note' || parsed.explanation || parsed.content) {
        return (
          <div className="w-full flex flex-col gap-4">
            <div className="prose prose-invert prose-p:leading-relaxed prose-headings:text-indigo-400 prose-strong:text-white max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{ code: CodeBlock }}
              >
                {parsed.explanation || parsed.content || ""}
              </ReactMarkdown>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-900">
               <div className="flex-1">
                  <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Suggested Action</div>
                  <div className="text-xs text-neutral-400 font-medium truncate">{parsed.filename || "Study Note"}</div>
               </div>
               <button
                onClick={() => {
                  toast.promise(saveNoteToDatabase(parsed), {
                    loading: 'Saving to your notes...',
                    success: 'Note saved successfully!',
                    error: 'Failed to save note'
                  });
                }}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-bold text-indigo-400 transition-all flex items-center gap-2 shadow-sm"
               >
                 <Save size={12} /> Save to Notes
               </button>
            </div>
          </div>
        );
      }

      if (parsed.type === 'flashcards' && Array.isArray(parsed.data)) {
        return (
          <div className="w-full space-y-4">
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Generated Flashcards</div>
            {parsed.data.map((card: any, i: number) => (
              <div key={i} className="bg-neutral-950 border border-neutral-800/50 p-4 rounded-2xl">
                <div className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-tighter">Question</div>
                <div className="text-[15px] text-white font-medium mb-4">{card.question}</div>
                <div className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-tighter">Answer</div>
                <div className="text-[14px] text-neutral-400">{card.answer}</div>
              </div>
            ))}
          </div>
        );
      }

      if (parsed.type === 'tool_action') {
        return (
          <div className="w-full mt-2 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-xl overflow-hidden relative">
            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Suggested Tool</div>
            <h3 className="text-sm font-bold text-white mb-2">{parsed.params?.description || "Document Process"}</h3>
            <p className="text-xs text-neutral-400 mb-4 line-clamp-2">{parsed.explanation}</p>
            
            {parsed.files?.map((filename: string, i: number) => (
               <div key={i} className="text-[10px] text-neutral-500 flex items-center gap-2 mb-1.5 bg-black/40 p-1.5 rounded-lg border border-white/5 font-medium truncate">
                  <FileBox size={10} /> {filename}
               </div>
            ))}

            <button
              onClick={() => {
                const doc = availableDocs.find(d => d.label === (parsed.files?.[0] || ""));
                const params = new URLSearchParams();
                if (doc?.id) params.set('fileId', doc.id);
                if (parsed.params?.page_order) params.set('pageOrder', JSON.stringify(parsed.params.page_order));
                router.push(`/tools/${parsed.tool}?${params.toString()}`);
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-neutral-100 font-black text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg active:scale-95"
            >
              Launch Tool
              <ArrowRight size={12} />
            </button>
          </div>
        );
      }

      return (
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-indigo-400">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{ code: CodeBlock }}>
            {content}
          </ReactMarkdown>
        </div>
      );
    } catch (e) {
      return (
        <div className="prose prose-invert prose-p:leading-relaxed prose-headings:text-indigo-400 prose-strong:text-white max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{ code: CodeBlock }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }
  };

  const clearChat = () => {
    setMessages([{ id: Date.now().toString(), role: "assistant", content: "Session reset. What's on your mind?" }]);
  };

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`relative w-full ${
          viewMode === 'mac' 
            ? "max-w-5xl aspect-[16/10] h-[80vh] rounded-3xl" 
            : "max-w-sm aspect-[9/16] h-[85vh] rounded-[3rem]"
        } bg-[#050505] border border-neutral-800/80 shadow-[0_40px_120px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col pointer-events-auto`}
      >
        {viewMode === 'mobile' ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-neutral-900 rounded-full" />
        ) : (
          <div className="absolute top-6 left-6 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] opacity-80" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] opacity-80" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] opacity-80" />
          </div>
        )}

        <div className={`px-6 pb-4 flex items-center justify-between ${viewMode === 'mac' ? 'pt-6 mt-10' : 'pt-10'}`}>
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <Sparkles size={16} />
             </div>
             <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Orbit AI</h3>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Active</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={clearChat} className="p-2 text-neutral-600 hover:text-white transition-colors">
                <Trash2 size={16} />
             </button>
             <button onClick={onClose} className="p-2 text-neutral-600 hover:text-white transition-colors">
                <X size={18} />
             </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto px-6 py-4 space-y-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${viewMode === 'mac' ? 'max-w-6xl mx-auto w-full' : ''}`}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end text-right' : 'items-start text-left'}`}>
               <div className={`flex items-center gap-2 opacity-30 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'user' ? <User size={10} className="text-white" /> : <Sparkles size={10} className="text-indigo-400" />}
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{msg.role}</span>
               </div>
               <div className="w-full">
                  {renderMessageContent(msg.content)}
               </div>
               <div className={`h-[1px] w-4 bg-neutral-900 mt-2 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`} />
            </div>
          ))}

          {isTyping && (
             <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 opacity-30">
                   <Sparkles size={10} className="text-indigo-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">assistant</span>
                </div>
                <div className="flex gap-1.5 items-center pl-1">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
             </div>
          )}
          <div ref={messagesEndRef} className="h-20" />
        </div>

        <div className={`p-6 pb-2 bg-gradient-to-t from-black via-black to-transparent mt-auto relative ${viewMode === 'mac' ? 'max-w-4xl mx-auto w-full' : ''}`}>
          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {((showMentions && filteredDocs.length > 0) || 
              (showCommands && filteredCommands.length > 0) || 
              (showTools && filteredTools.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full mb-4 left-0 w-[calc(100%-3rem)] mx-6 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50"
              >
                {showMentions && (
                  <div className="p-2">
                    {filteredDocs.map((doc, i) => (
                      <div
                        key={doc.id}
                        onClick={() => insertCompletion(`@${doc.label}`)}
                        className={`px-3 py-2 flex items-center gap-3 cursor-pointer rounded-xl transition-colors ${i === selectedIndex ? 'bg-indigo-500/10 text-indigo-400' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                      >
                        {doc.type === 'note' ? <FileText size={14} /> : <FileBox size={14} />}
                        <span className="font-medium text-xs truncate">{doc.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showCommands && (
                  <div className="p-2">
                    {filteredCommands.map((cmd, i) => (
                      <div
                        key={cmd.id}
                        onClick={() => insertCompletion(cmd.label)}
                        className={`px-3 py-2 flex items-center gap-3 cursor-pointer rounded-xl transition-colors ${i === selectedIndex ? 'bg-indigo-500/10 text-indigo-400' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                      >
                         <Command size={14} />
                         <span className="font-medium text-xs">{cmd.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showTools && (
                  <div className="p-2">
                    {filteredTools.map((tool, i) => (
                      <div
                        key={tool.id}
                        onClick={() => insertCompletion(tool.label)}
                        className={`px-3 py-2 flex items-center gap-3 cursor-pointer rounded-xl transition-colors ${i === selectedIndex ? 'bg-indigo-500/10 text-indigo-400' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                      >
                         <Command size={14} />
                         <span className="font-medium text-xs">{tool.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-center bg-[#111] border border-neutral-800 rounded-2xl transition-all shadow-inner overflow-hidden pr-2">
            <textarea
              autoFocus
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                 if (showMentions && filteredDocs.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % filteredDocs.length); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + filteredDocs.length) % filteredDocs.length); }
                    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertCompletion(`@${filteredDocs[selectedIndex].label}`); }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowMentions(false); }
                 } else if (showCommands && filteredCommands.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % filteredCommands.length); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length); }
                    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertCompletion(filteredCommands[selectedIndex].label); }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowCommands(false); }
                 } else if (showTools && filteredTools.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % filteredTools.length); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + filteredTools.length) % filteredTools.length); }
                    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertCompletion(filteredTools[selectedIndex].label); }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowTools(false); }
                 } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                 }
              }}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-neutral-700 resize-none max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-30 flex-shrink-0 shadow-lg"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="mt-2 flex justify-center opacity-10 group">
             <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[9px] font-black text-neutral-600 uppercase">⌘ Enter</kbd>
                <span className="text-[9px] font-black text-neutral-700 uppercase tracking-tighter">Submit</span>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
