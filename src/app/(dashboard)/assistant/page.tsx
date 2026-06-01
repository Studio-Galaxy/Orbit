"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Trash2, FileText, FileBox, Command, CheckSquare, Save, Upload, Copy, Check, ArrowRight, Menu } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import mammoth from "mammoth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { marked } from 'marked';
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
  { id: "merge-pdf", label: "#merge-pdf", desc: "Merge multiple @PDFs into one" },
  { id: "edit-pdf", label: "#edit-pdf", desc: "Rearrange/Delete pages in @PDF" },
  { id: "compress-pdf", label: "#compress-pdf", desc: "Shrink @PDF file size" },
  { id: "pdf-to-image", label: "#pdf-to-image", desc: "Extract JPGs from @PDF" },
  { id: "image-to-pdf", label: "#image-to-pdf", desc: "Turn @Images into a PDF" },
  { id: "word-to-pdf", label: "#word-to-pdf", desc: "Convert Word doc to PDF" },
];

const CodeBlock = ({ className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard!");
  };

  const inline = !className;

  return !inline ? (
    <div className="relative group/code my-6 not-prose">
      <div className="absolute right-3 top-3 opacity-0 group-hover/code:opacity-100 transition-opacity z-20">
        <button
          onClick={handleCopy}
          className="p-2 bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md rounded-lg border border-neutral-800 text-neutral-500 hover:text-neutral-200 transition-all outline-none shadow-xl"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        </button>
      </div>
      <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-2xl">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            backgroundColor: '#0d0d0d',
            fontSize: '12px',
            lineHeight: '1.7',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'inherit',
            }
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    </div>
  ) : (
    <code className="bg-neutral-900 text-indigo-300/80 px-1.5 py-0.5 rounded text-[11px] font-medium font-mono border border-neutral-800/50" {...props}>
      {children}
    </code>
  );
};

export default function AssistantPage() {
  const { toggleMobile } = useSidebar();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your enhanced AI assistant. You can mention your notes or PDFs by typing `@` or use commands like `/flashcards`."
    }
  ]);

  const [availableDocs, setAvailableDocs] = useState<{ type: string, id: string, label: string, url?: string }[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [avatarInitial, setAvatarInitial] = useState("Y");
  const [activeContext, setActiveContext] = useState<any[]>([]);
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (msgId: string, cardIndex: number) => {
    const key = `${msgId}-${cardIndex}`;
    setRevealedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const supabase = createClient();

  useEffect(() => {
    const fetchDocs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (user.user_metadata?.full_name) {
        const rawName = user.user_metadata.full_name.split(' ')[0];
        setFirstName(rawName);
        setAvatarInitial(rawName.charAt(0).toUpperCase());
      }

      const { data: notesData } = await supabase.from('notes').select('id, title').eq('user_id', user.id).order('updated_at', { ascending: false });
      const { data: vaultData } = await supabase.from('vault_files').select('id, filename, file_url').eq('user_id', user.id).order('created_at', { ascending: false });

      const docs: { type: string, id: string, label: string, url?: string }[] = [];
      if (notesData) notesData.forEach(n => docs.push({ type: 'note', id: n.id, label: n.title }));
      if (vaultData) vaultData.forEach(v => docs.push({ type: 'pdf', id: v.id, label: v.filename, url: v.file_url }));

      setAvailableDocs(docs);
    };
    fetchDocs();

    const saved = localStorage.getItem("orbit-chat-messages");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch (e) { }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("orbit-chat-messages", JSON.stringify(messages));
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoaded]);

  useEffect(() => {
    const lastWord = input.split(' ').pop() || "";
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setShowCommands(false);
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

  const filteredDocs = availableDocs.filter(d => d && d.label && d.label.toLowerCase().includes(filterText)).slice(0, 5);
  const filteredCommands = COMMANDS.filter(c => c && c.label && c.label.toLowerCase().includes(filterText)).slice(0, 5);
  const filteredTools = TOOL_COMMANDS.filter(t => t && t.label && t.label.toLowerCase().includes(filterText)).slice(0, 5);

  const insertCompletion = (text: string) => {
    const words = input.split(' ');
    words.pop();
    words.push(text + " ");
    setInput(words.join(' '));
    setInput(words.join(' '));
    setShowMentions(false);
    setShowCommands(false);
    setShowTools(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredDocs.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % filteredDocs.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + filteredDocs.length) % filteredDocs.length); }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertCompletion(`@${filteredDocs[selectedIndex].label}`); }
      if (e.key === 'Escape') { e.preventDefault(); setShowMentions(false); }
    } else if (showCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % filteredCommands.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length); }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertCompletion(filteredCommands[selectedIndex].label); }
      if (e.key === 'Escape') { e.preventDefault(); setShowCommands(false); }
    } else if (showTools && filteredTools.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % filteredTools.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + filteredTools.length) % filteredTools.length); }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertCompletion(filteredTools[selectedIndex].label); }
      if (e.key === 'Escape') { e.preventDefault(); setShowTools(false); }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getContextDocsForInput = (text: string) => {
    return availableDocs.filter(doc => text.includes(`@${doc.label}`));
  };

  const clearChat = () => {
    setMessages([{ id: Date.now().toString(), role: "assistant", content: `Hi ${firstName || 'there'}! How can I help you today?` }]);
    setActiveContext([]);
  };

  const handleToolExecution = async (toolId: string, fullInput: string, docs: any[]) => {
    setIsTyping(true);
    const toastId = toast.loading(`Executing ${toolId}...`);

    try {
      if (docs.length === 0 && toolId !== 'image-to-pdf') {
        throw new Error("Please mention a file using @ to process it.");
      }

      let resultBlob: Blob | null = null;
      let filename = "processed_document.pdf";

      if (toolId === 'compress-pdf') {
        const doc = docs[0];
        const res = await fetch(doc.url);
        const arrayBuffer = await res.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        resultBlob = new Blob([compressedBytes as any], { type: 'application/pdf' });
        filename = `compressed_${doc.label}`;
      } else if (toolId === 'merge-pdf') {
        const mergedPdf = await PDFDocument.create();
        for (const doc of docs) {
          if (!doc.url) continue;
          const res = await fetch(doc.url);
          const arrayBuffer = await res.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
        }
        const mergedBytes = await mergedPdf.save();
        resultBlob = new Blob([mergedBytes as any], { type: 'application/pdf' });
        filename = `merged_${docs.length}_docs.pdf`;
      } else if (toolId === 'edit-pdf') {
        const doc = docs[0];
        const res = await fetch(doc.url);
        const arrayBuffer = await res.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        const lowerInput = fullInput.toLowerCase();
        let indices = pdfDoc.getPageIndices();

        // Simple "Smart" Parsing
        if (lowerInput.includes('delete page')) {
          const pageMatch = lowerInput.match(/delete page (\d+)/);
          if (pageMatch) {
            const pageNum = parseInt(pageMatch[1]) - 1;
            if (pageNum >= 0 && pageNum < indices.length) {
              pdfDoc.removePage(pageNum);
              toast.info(`Deleted page ${pageNum + 1}`);
            }
          }
        } else if (lowerInput.includes('swap page')) {
          const swapMatch = lowerInput.match(/swap page (\d+) with (\d+)/) || lowerInput.match(/swap page (\d+) and (\d+)/);
          if (swapMatch) {
            const p1 = parseInt(swapMatch[1]) - 1;
            const p2 = parseInt(swapMatch[2]) - 1;
            if (p1 >= 0 && p1 < indices.length && p2 >= 0 && p2 < indices.length) {
              // Re-order by copying all and re-inserting
              // Simpler swap if not deleting:
              const pages = await pdfDoc.save();
              const newPdf = await PDFDocument.load(pages);
              // Implementation of real swap logic
              const pageIndices = newPdf.getPageIndices();
              [pageIndices[p1], pageIndices[p2]] = [pageIndices[p2], pageIndices[p1]];

              const finalPdf = await PDFDocument.create();
              const sourcePdf = await PDFDocument.load(pages);
              const copiedPages = await finalPdf.copyPages(sourcePdf, pageIndices);
              copiedPages.forEach(p => finalPdf.addPage(p));
              const finalBytes = await finalPdf.save();
              resultBlob = new Blob([finalBytes as any], { type: 'application/pdf' });
              filename = `edited_${doc.label}`;
            }
          }
        }

        if (!resultBlob) {
          const editedBytes = await pdfDoc.save();
          resultBlob = new Blob([editedBytes as any], { type: 'application/pdf' });
          filename = `edited_${doc.label}`;
        }
      } else if (toolId === 'word-to-pdf') {
        const doc = docs[0];
        const res = await fetch(doc.url);
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });

        const newPdf = await PDFDocument.create();
        const page = newPdf.addPage([600, 800]);
        page.drawText(result.value.replace(/<[^>]*>/g, '').slice(0, 2000), { x: 50, y: 750, size: 10 });

        const pdfBytes = await newPdf.save();
        resultBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        filename = `${doc.label.split('.')[0]}.pdf`;
      }

      if (resultBlob) {
        const reader = new FileReader();
        reader.readAsDataURL(resultBlob);
        reader.onloadend = () => {
          const base64data = reader.result;
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: "assistant",
            content: JSON.stringify({
              type: 'tool_result',
              tool: toolId,
              filename: filename,
              data: base64data
            })
          }]);
        };
        toast.success("Task completed!", { id: toastId });
      } else {
        throw new Error("Tool logic not fully implemented yet.");
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const explicitlyMentioned = getContextDocsForInput(input);
    const updatedContext = [...activeContext];

    explicitlyMentioned.forEach(doc => {
      if (!updatedContext.some(d => d.id === doc.id)) {
        updatedContext.push(doc);
      }
    });

    setActiveContext(updatedContext);

    const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, newUserMsg];

    setMessages(newMessages);
    setInput("");

    // Check for Tool Commands (#)
    if (input.startsWith('#')) {
      const toolCmd = TOOL_COMMANDS.find(t => input.startsWith(t.label));
      if (toolCmd) {
        handleToolExecution(toolCmd.id, input, explicitlyMentioned);
        return;
      }
    }

    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, contextDocs: updatedContext })
      });
      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: typeof data.reply === 'string' ? data.reply : JSON.stringify(data.reply) }]);
      } else {
        throw new Error(data.error || "No reply returned");
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I ran into an error trying to process that." }]);
    } finally {
      setIsTyping(false);
    }
  };


  const renderMessageContent = (content: string, msgId: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === 'flashcards' && Array.isArray(parsed.data)) {
        return (
          <div className="w-full mt-4">
            <div className="flex items-center gap-2.5 text-indigo-400/90 mb-5 font-semibold text-xs uppercase tracking-widest px-1">
              <Command size={14} /> Study Flashcards
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsed.data.map((card: any, i: number) => {
                const key = `${msgId}-${i}`;
                const isRevealed = revealedCards[key];
                return (
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    key={i}
                    onClick={() => toggleCard(msgId, i)}
                    className="group cursor-pointer aspect-[16/10] relative bg-[#0a0a0a] border border-neutral-800/60 p-5 rounded-2xl shadow-sm hover:border-neutral-700/80 transition-all flex flex-col justify-center items-center text-center overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className={`absolute inset-0 p-5 flex flex-col justify-center items-center transition-all duration-500 ${isRevealed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                      <div className="text-[13px] font-medium text-neutral-200 leading-relaxed line-clamp-4 px-2 tracking-tight">{card.question}</div>
                      <div className="mt-4 text-[10px] text-neutral-500 font-bold uppercase tracking-widest bg-neutral-900/50 px-3 py-1 rounded-full border border-neutral-800/50">Tap to Flip</div>
                    </div>

                    <div className={`absolute inset-0 p-5 flex flex-col justify-center items-center bg-indigo-500/[0.03] transition-all duration-500 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                      <div className="text-[13px] text-indigo-100/90 leading-relaxed line-clamp-4 px-2 font-medium">{card.answer}</div>
                      <div className="mt-4 text-[10px] text-indigo-400/80 font-bold uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/10">Definition</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      }
      if (parsed.type === 'viva' && Array.isArray(parsed.data)) {
        return (
          <div className="w-full mt-4">
            <div className="flex items-center gap-2.5 text-rose-400/90 mb-5 font-semibold text-xs uppercase tracking-widest px-1">
              <CheckSquare size={14} /> {parsed.filename ? `Exam Prep: ${parsed.filename}` : "Viva Voce Practice"}
            </div>
            <div className="space-y-3">
              {parsed.data.map((q: any, i: number) => (
                <div key={i} className="group bg-[#0a0a0a] border border-neutral-800/60 p-5 rounded-2xl shadow-sm hover:border-neutral-700/80 transition-all">
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-500 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1 space-y-3">
                      <div className="text-[13px] font-semibold text-neutral-100 leading-relaxed tracking-tight">{q.question}</div>
                      <div className="text-[12px] text-neutral-400 leading-relaxed font-medium bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/30">
                        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block mb-1">Expected Concept</span>
                        {q.answer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-start mt-6">
              <button
                onClick={async () => {
                  const toastId = toast.loading("Saving to Notes...");
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const markdown = parsed.data.map((q: any, i: number) => {
                        return `### Q${i + 1}: ${q.question}\n\n**Expected Answer:** ${q.answer}\n\n`;
                      }).join('\n');
                      let htmlContent = marked.parse(markdown);

                      if (typeof htmlContent === 'string') {
                        htmlContent = htmlContent.replace(/\$([^\$]+)\$/g, '<span data-type="mathematics" latex="$1"></span>');
                      }

                      await supabase.from('notes').insert({
                        user_id: user.id,
                        title: `Viva Questions for ${parsed.filename || 'Notes'}`,
                        content: htmlContent
                      });
                      toast.success("Saved to Notes", { id: toastId });
                    }
                  } catch (e) {
                    toast.error("Failed to save note", { id: toastId });
                  }
                }}
                className="px-5 py-2.5 bg-neutral-100 hover:bg-white text-black rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save size={14} /> Save to Study Notes
              </button>
            </div>
          </div>
        );
      }
      if (parsed.type === 'save_note') {
        return (
          <div className="w-full mt-4 bg-[#0d0d0d] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-2.5 text-indigo-400/90 mb-6 font-semibold text-xs uppercase tracking-widest">
                <FileText size={14} /> Knowledge Summary
              </div>
              <div className="text-[13px] text-neutral-200 leading-[1.7] markdown-preview prose prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-6 prose-strong:text-white max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    pre: ({ children }) => <>{children}</>,
                    code: CodeBlock
                  }}
                >
                  {parsed.explanation || "I've generated a detailed explanation for this topic."}
                </ReactMarkdown>
              </div>
            </div>
            
            <div className="bg-neutral-900/30 border-t border-neutral-800/60 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 shrink-0 shadow-inner">
                  <Save size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-0.5">Draft Saved</div>
                  <div className="text-[12px] text-neutral-300 font-semibold truncate">{parsed.filename || "AI_Generated_Note"}</div>
                </div>
              </div>
              <button
                onClick={async () => {
                  const toastId = toast.loading("Saving to Notes...");
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const markdown = parsed.content || parsed.explanation || "";
                      let htmlContent = marked.parse(markdown);

                      if (typeof htmlContent === 'string') {
                        htmlContent = htmlContent.replace(/\$([^\$]+)\$/g, '<span data-type="mathematics" latex="$1"></span>');
                      }

                      await supabase.from('notes').insert({
                        user_id: user.id,
                        title: parsed.filename || "AI Generated Note",
                        content: htmlContent
                      });
                      toast.success("Saved to Notes", { id: toastId });
                    }
                  } catch (e) {
                    toast.error("Failed to save note", { id: toastId });
                  }
                }}
                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-[11px] font-bold transition-all shadow-lg active:scale-95 shrink-0"
              >
                Finalize to Library
              </button>
            </div>
          </div>
        );
      }
      if (parsed.type === 'tool_result') {
        return (
          <div className="w-full mt-4 p-[1px] bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-800 rounded-2xl shadow-xl overflow-hidden group">
            <div className="bg-[#0a0a0a] rounded-[15px] p-6 h-full w-full relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-[60px] pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
              
              <div className="flex items-center gap-5 mb-8 relative">
                <div className="w-12 h-12 rounded-[14px] bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center text-indigo-400 border border-neutral-800/80 shadow-2xl relative">
                  <div className="absolute inset-0 bg-indigo-500/5 blur-md rounded-full" />
                  <FileBox size={22} className="relative z-10" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.15em] mb-1 opacity-80">Task Processed</div>
                  <h3 className="text-[14px] font-bold text-neutral-100 truncate">{parsed.filename}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 relative">
                <button
                  onClick={async () => {
                    const toastId = toast.loading("Saving to Vault...");
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Please login");

                      const res = await fetch(parsed.data);
                      const blob = await res.blob();
                      const file = new File([blob], parsed.filename, { type: blob.type });

                      const filePath = `${user.id}/${Date.now()}_${parsed.filename}`;
                      const { error: uploadError } = await supabase.storage.from('vault_files').upload(filePath, file);
                      if (uploadError) throw uploadError;

                      const { data: { publicUrl } } = supabase.storage.from('vault_files').getPublicUrl(filePath);
                      const { data: vaultData, error: dbError } = await supabase.from('vault_files').insert({
                        user_id: user.id,
                        filename: parsed.filename,
                        file_format: parsed.filename.split('.').pop()?.toLowerCase() || 'pdf',
                        file_url: publicUrl,
                      }).select().single();

                      if (dbError) throw dbError;
                      if (vaultData) {
                        setAvailableDocs(prev => [{
                          type: 'pdf',
                          id: vaultData.id,
                          label: vaultData.filename,
                          url: vaultData.file_url
                        }, ...prev]);
                      }

                      toast.success("Saved to Vault!", { id: toastId });
                    } catch (e: any) {
                      toast.error(e.message, { id: toastId });
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-[11px] font-bold transition-all border border-neutral-800/80 shadow-sm active:scale-95"
                >
                  <Save size={14} className="opacity-70" /> Save to Vault
                </button>

                <button
                  onClick={async () => {
                    const res = await fetch(parsed.data);
                    const blob = await res.blob();
                    saveAs(blob, parsed.filename);
                    toast.success("Downloaded!");
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 hover:bg-white text-black rounded-xl text-[11px] font-bold transition-all shadow-md active:scale-95"
                >
                  <FileText size={14} className="opacity-80" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        );
      }
      if (parsed.type === 'tool_action') {
        const toolIcon = TOOL_COMMANDS.find(t => t.id === parsed.tool)?.label || "#tool";
        return (
          <div className="w-full mt-4 p-[1px] bg-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden group/action">
            <div className="bg-[#0a0a0a]/90 backdrop-blur-xl rounded-[15px] p-6 relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] pointer-events-none group-hover/action:bg-indigo-500/20 transition-all" />

              <div className="flex items-center gap-4 mb-5 relative">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner group-hover/action:border-indigo-500/50 transition-colors">
                  <Command size={18} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Recommended Workflow</div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{parsed.params?.description || "Document Process"}</h3>
                </div>
              </div>

              <div className="text-[12px] text-neutral-400 mb-6 leading-relaxed font-medium">
                {parsed.explanation}
              </div>

              <div className="flex flex-col gap-2 relative">
                {parsed.files?.map((filename: string, i: number) => {
                  const doc = availableDocs.find(d => d.label === filename);
                  return (
                    <div key={i} className="flex items-center gap-3 bg-neutral-900/50 border border-neutral-800/50 p-2.5 rounded-xl group/file">
                      <FileBox size={14} className="text-neutral-600 group-hover/file:text-indigo-400/70 transition-colors" />
                      <span className="text-[11px] text-neutral-300 truncate flex-1 font-semibold">{filename}</span>
                      {!doc && <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const doc = availableDocs.find(d => d.label === (parsed.files?.[0] || ""));
                  if (!doc && parsed.tool !== 'image-to-pdf') {
                    toast.error(`File "${parsed.files?.[0]}" not found in your vault.`);
                    return;
                  }

                  const params = new URLSearchParams();
                  if (doc?.id) params.set('fileId', doc.id);
                  if (parsed.params?.page_order) params.set('pageOrder', JSON.stringify(parsed.params.page_order));

                  router.push(`/tools/${parsed.tool}?${params.toString()}`);
                }}
                className="mt-6 w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-neutral-100 text-black hover:bg-white font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-[0.98] group/btn"
              >
                Open {parsed.tool.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        );
      }
      return <pre className="whitespace-pre-wrap font-sans text-sm">{JSON.stringify(parsed, null, 2)}</pre>;
    } catch (e) {
      // Not JSON, just standard Markdown/Text
      return (
        <div className="text-sm leading-relaxed prose prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-6 prose-strong:text-white max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              pre: ({ children }) => <>{children}</>,
              code: CodeBlock
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-4xl mx-auto pt-6 px-4 pb-0 items-center justify-end relative">
      <div className="absolute top-4 left-4 z-20 md:hidden">
        <button 
          onClick={toggleMobile}
          className="p-2 text-neutral-400 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>
      {messages.length === 1 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center opacity-40 pointer-events-none z-0">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full" />
            <Sparkles size={48} className="text-white relative z-10" />
          </div>
          <h1 className="text-xl font-medium text-neutral-200 tracking-tight">How can Orbit help you today?</h1>
          <p className="text-sm text-neutral-500 mt-2 max-w-[280px]">Mention your notes with @ or use /commands to get started</p>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 w-full overflow-y-auto relative space-y-10 pb-44 pt-8 z-10 flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {messages.length > 1 && (
          <div className="absolute top-8 right-0 md:right-2 z-20">
            <button
              onClick={clearChat}
              className="text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-neutral-900/50 border border-neutral-800/50 backdrop-blur-sm"
            >
              <Trash2 size={12} /> Clear Chat
            </button>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-5 max-w-[94%] md:max-w-[85%] items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 pt-1">
                {msg.role === 'user' ? (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-[10px] font-bold text-white border border-neutral-600/50 shadow-sm overflow-hidden uppercase">
                    {avatarInitial}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black shadow-lg">
                    <Sparkles size={12} />
                  </div>
                )}
              </div>
              <div className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`w-full ${
                  msg.role === 'user' 
                    ? 'text-neutral-200 bg-[#0d0d0d] px-5 py-3.5 rounded-2xl rounded-tr-[4px] border border-neutral-800/80 shadow-sm' 
                    : 'text-neutral-200 pt-1'
                }`}>
                  {renderMessageContent(msg.content, msg.id)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full justify-start"
          >
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mt-1">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div className="flex items-center gap-1 h-10 px-4 bg-neutral-900/50 rounded-2xl rounded-tl-sm border border-neutral-800/50">
                <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-12" />
      </div>

      {/* Fade Overlay */}
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-15" />

      {/* Input Area */}
      <div className="w-full max-w-3xl mx-auto px-4 pb-2 z-20 relative">
        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {(showMentions || showCommands || showTools) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="absolute bottom-full mb-6 left-0 w-full max-w-[320px] bg-[#0d0d0d] border border-neutral-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl z-50 flex flex-col p-2"
            >
              {showMentions && (
                <div className="flex flex-col">
                  <div className="px-3 py-2 text-[9px] font-black text-neutral-500 uppercase tracking-[0.2em] bg-neutral-900/30 rounded-lg mb-1">
                    <span>Library Context (@)</span>
                  </div>
                  {filteredDocs.length > 0 ? filteredDocs.map((doc, i) => (
                    <button
                      key={doc.id}
                      onClick={() => insertCompletion(`@${doc.label}`)}
                      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-all text-left ${i === selectedIndex ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-800/40'}`}
                    >
                      <div className={`p-1.5 rounded-lg ${i === selectedIndex ? 'bg-neutral-200 text-black' : 'bg-neutral-900 text-neutral-600'}`}>
                        {doc.type === 'note' ? <FileText size={14} /> : <FileBox size={14} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[13px] truncate">{doc.label}</span>
                        <span className={`text-[10px] truncate uppercase tracking-tighter ${i === selectedIndex ? 'text-black/60' : 'text-neutral-500'}`}>
                          {doc.type === 'note' ? 'Knowledge Note' : 'Vault PDF'}
                        </span>
                      </div>
                    </button>
                  )) : (
                    <div className="px-3 py-6 text-center text-xs text-neutral-500 font-medium">No files found</div>
                  )}
                </div>
              )}
              {showCommands && (
                <div className="flex flex-col">
                  <div className="px-3 py-2 text-[9px] font-black text-neutral-500 uppercase tracking-[0.2em] flex justify-between items-center bg-neutral-900/30 rounded-lg mb-1">
                    <span>AI Commands (/)</span>
                  </div>
                  {filteredCommands.length > 0 ? filteredCommands.map((cmd, i) => (
                    <button
                      key={cmd.id}
                      onClick={() => insertCompletion(cmd.label)}
                      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-all text-left ${i === selectedIndex ? 'bg-neutral-100 text-black' : 'text-neutral-400 hover:bg-neutral-800/40'}`}
                    >
                      <div className={`p-1.5 rounded-lg ${i === selectedIndex ? 'bg-black text-white' : 'bg-neutral-900 text-neutral-600'}`}>
                        <Command size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[13px]">{cmd.label}</span>
                        <span className={`text-[10px] truncate ${i === selectedIndex ? 'text-black/60' : 'text-neutral-500'}`}>{cmd.desc}</span>
                      </div>
                    </button>
                  )) : null}
                </div>
              )}
              {showTools && (
                <div className="flex flex-col">
                  <div className="px-3 py-2 text-[9px] font-black text-neutral-500 uppercase tracking-[0.2em] flex justify-between items-center bg-neutral-900/30 rounded-lg mb-1">
                    <span>PDF Workflows (#)</span>
                  </div>
                  {filteredTools.length > 0 ? filteredTools.map((tool, i) => (
                    <button
                      key={tool.id}
                      onClick={() => insertCompletion(tool.label)}
                      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-all text-left ${i === selectedIndex ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-800/40'}`}
                    >
                      <div className={`p-1.5 rounded-lg ${i === selectedIndex ? 'bg-neutral-200 text-black' : 'bg-neutral-900 text-neutral-600'}`}>
                        <Command size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[13px]">{tool.label}</span>
                        <span className={`text-[10px] truncate ${i === selectedIndex ? 'text-black/60' : 'text-neutral-500'}`}>{tool.desc}</span>
                      </div>
                    </button>
                  )) : (
                    <div className="px-3 py-6 text-center text-xs text-neutral-500 font-medium">No tools found</div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative group/input">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-indigo-500/20 rounded-[22px] blur-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
          
          <div className="relative flex flex-col w-full bg-[#0d0d0d]/80 backdrop-blur-xl border border-neutral-800/80 focus-within:border-neutral-600/80 transition-all duration-300 rounded-[20px] p-2 shadow-2xl">
            <div className="flex items-end w-full">
              <input
                type="file"
                className="hidden"
                id="assistant-upload"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const toastId = toast.loading("Preparing file...");
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Please login");

                    const filePath = `${user.id}/${Date.now()}_${file.name}`;
                    const { error: uploadError } = await supabase.storage.from('vault_files').upload(filePath, file);
                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage.from('vault_files').getPublicUrl(filePath);
                    const { data: vaultData } = await supabase.from('vault_files').insert({
                      user_id: user.id,
                      filename: file.name,
                      file_url: publicUrl,
                    }).select().single();

                    if (vaultData) {
                      setAvailableDocs(prev => [{
                        type: 'pdf',
                        id: vaultData.id,
                        label: vaultData.filename,
                        url: vaultData.file_url
                      }, ...prev]);
                      setInput(prev => prev + ` @${file.name} `);
                      toast.success("File ready in vault!", { id: toastId });
                    }
                  } catch (err: any) {
                    toast.error(err.message, { id: toastId });
                  }
                }}
              />
              <label
                htmlFor="assistant-upload"
                className="p-3.5 mb-0.5 text-neutral-500 hover:text-white transition-colors cursor-pointer rounded-xl flex items-center justify-center hover:bg-neutral-800/50"
              >
                <Upload size={18} />
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything or use '/' for commands..."
                className="flex-1 bg-transparent border-none outline-none text-neutral-200 text-[14px] px-4 py-3.5 placeholder-neutral-600 resize-none min-h-[52px] max-h-48 overflow-y-auto leading-[1.6] scrollbar-hide"
                rows={1}
              />
              <button
                onClick={handleSend}
                className="p-3.5 ml-2 bg-neutral-100 text-black hover:bg-white transition-all rounded-[14px] flex items-center justify-center disabled:opacity-30 disabled:grayscale shrink-0 h-[46px] w-[46px] shadow-lg active:scale-90"
                disabled={!input.trim() || isTyping}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center gap-4 mt-4">
          <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest opacity-40">Privacy Protected</span>
          <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest opacity-40">•</span>
          <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest opacity-40 px-1">AI Verified</span>
        </div>
      </div>
    </div>
  );
}
