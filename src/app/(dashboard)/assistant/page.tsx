"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Trash2, FileText, FileBox, Command, CheckSquare, Save, Upload, Copy, Check } from "lucide-react";
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
      <div className="absolute right-4 top-4 opacity-0 group-hover/code:opacity-100 transition-opacity z-20">
        <button 
          onClick={handleCopy}
          className="p-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-neutral-500 hover:text-white transition-all outline-none"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden border border-neutral-900 shadow-2xl">
        <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
                margin: 0,
                padding: '1.5rem',
                backgroundColor: '#050505',
                fontSize: '13px',
                lineHeight: '1.6',
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
    <code className="bg-neutral-900/50 text-indigo-300 px-1.5 py-0.5 rounded text-[12px] font-medium font-mono border border-neutral-800/50" {...props}>
      {children}
    </code>
  );
};

export default function AssistantPage() {
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

  const [availableDocs, setAvailableDocs] = useState<{type: string, id: string, label: string, url?: string}[]>([]);
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

      const docs: {type: string, id: string, label: string, url?: string}[] = [];
      if (notesData) notesData.forEach(n => docs.push({ type: 'note', id: n.id, label: n.title }));
      if (vaultData) vaultData.forEach(v => docs.push({ type: 'pdf', id: v.id, label: v.filename, url: v.file_url }));

      setAvailableDocs(docs);
    };
    fetchDocs();

    const saved = localStorage.getItem("orbit-chat-messages");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch (e) {}
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
          <div className="w-full mt-2 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 mb-2 font-medium">
              <Command size={16} /> Generated Flashcards
            </div>
            {parsed.data.map((card: any, i: number) => {
              const key = `${msgId}-${i}`;
              const isRevealed = revealedCards[key];
              return (
                <div
                  key={i}
                  onClick={() => toggleCard(msgId, i)}
                  className="cursor-pointer relative bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-sm hover:border-neutral-700 transition-colors"
                >
                  <div className="text-sm font-semibold text-white mb-2 pb-2 border-b border-neutral-800">Q: {card.question}</div>
                  <div className={`text-sm text-neutral-300 transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
                    A: {card.answer}
                  </div>
                  {!isRevealed && (
                    <div className="text-xs text-indigo-400/60 font-medium absolute bottom-4 right-4 transition-opacity">Tap to reveal</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      if (parsed.type === 'viva' && Array.isArray(parsed.data)) {
         return (
          <div className="w-full mt-2 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 mb-2 font-medium">
              <CheckSquare size={16} /> {parsed.filename ? `Viva Questions for ${parsed.filename}` : "Viva Questions"}
            </div>
            {parsed.data.map((q: any, i: number) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-sm hover:border-neutral-700 transition-colors">
                <div className="text-sm font-semibold text-white mb-2">Q: {q.question}</div>
                <div className="text-sm text-neutral-400 italic">Expected: {q.answer}</div>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button
                onClick={async () => {
                  const toastId = toast.loading("Saving to Notes...");
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const markdown = parsed.data.map((q: any, i: number) => {
                        return `### Q${i+1}: ${q.question}\n\n**Expected Answer:** ${q.answer}\n\n`;
                      }).join('\n');
                      let htmlContent = marked.parse(markdown);
                      
                      // Convert $...$ to Tiptap-friendly math spans
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
                  } catch(e) {
                     toast.error("Failed to save note", { id: toastId });
                  }
                }}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg"
              >
                <Save size={14} /> Save to Notes
              </button>
            </div>
          </div>
        );
      }
      if (parsed.type === 'save_note') {
         return (
          <div className="w-full mt-2 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
             <div className="text-sm text-indigo-100 mb-4 markdown-preview prose prose-invert prose-p:leading-relaxed prose-p:my-1.5 prose-headings:mb-2 prose-headings:mt-4 prose-headings:text-indigo-300 prose-li:my-0.5 prose-strong:text-white max-w-none">
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
             <div className="flex flex-col gap-2 border-t border-indigo-500/20 pt-4">
               <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Suggested Note</div>
               <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-lg overflow-hidden shadow-inner">
                  <FileText size={16} className="text-neutral-500 shrink-0" />
                  <div className="text-sm text-white font-medium truncate flex-1">{parsed.filename || "AI_Generated_Note"}</div>
                  <button
                    onClick={async () => {
                      const toastId = toast.loading("Saving to Notes...");
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          const markdown = parsed.content || parsed.explanation || "";
                          let htmlContent = marked.parse(markdown);
                          
                          // Convert $...$ to Tiptap-friendly math spans
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
                      } catch(e) {
                         toast.error("Failed to save note", { id: toastId });
                      }
                    }}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Save size={14} /> Save to Notes
                  </button>
               </div>
             </div>
          </div>
         );
      }
      if (parsed.type === 'tool_result') {
        return (
          <div className="w-full mt-2 p-5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] pointer-events-none" />
            
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-neutral-950 flex items-center justify-center text-indigo-400 border border-neutral-800 shadow-inner">
                <FileBox size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-tighter mb-1">Task Completed</div>
                <h3 className="text-sm font-semibold text-white truncate max-w-[200px]">{parsed.filename}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative">
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
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all border border-neutral-700 shadow-lg group"
              >
                <Save size={14} className="group-hover:scale-110 transition-transform" /> Save to Vault
              </button>
              
              <button
                onClick={async () => {
                  const res = await fetch(parsed.data);
                  const blob = await res.blob();
                  saveAs(blob, parsed.filename);
                  toast.success("Downloaded!");
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-100 text-black rounded-xl text-xs font-bold transition-all shadow-lg group"
              >
                <FileText size={14} className="group-hover:scale-110 transition-transform" /> Download
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
      {messages.length === 1 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center opacity-30 pointer-events-none z-0">
          <Sparkles size={64} className="text-neutral-800 mb-6" />
          <h1 className="text-2xl font-semibold text-neutral-400">Orbit Study Assistant</h1>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 w-full overflow-y-auto relative space-y-8 pb-10 pt-8 z-10 flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {messages.length > 0 && (
          <div className="absolute top-8 right-0 md:right-2 z-20">
            <button
              onClick={clearChat}
              className="text-neutral-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg"
            >
              <Trash2 size={13} /> Clear
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
            <div className={`flex gap-4 max-w-[85%] items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0">
                {msg.role === 'user' ? (
                   <div className="w-8 h-8 mt-1.5 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-white border border-neutral-700 shadow-sm overflow-hidden">
                    {avatarInitial}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-md">
                    <Sparkles size={14} />
                  </div>
                )}
              </div>
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`w-full ${msg.role === 'user' ? 'text-white bg-neutral-800/80 px-4 py-3 rounded-2xl rounded-tr-sm border border-neutral-700/50' : 'text-neutral-200 pt-1'}`}>
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
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="w-full bg-black py-6 mt-auto z-20 relative">
        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {(showMentions || showCommands || showTools) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-4 left-0 w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50"
            >
              {showMentions && (
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider flex justify-between">
                    <span>Select Note or PDF</span>
                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">Tab</span>
                  </div>
                  {filteredDocs.length > 0 ? filteredDocs.map((doc, i) => (
                    <div
                      key={doc.id}
                      onClick={() => insertCompletion(`@${doc.label}`)}
                      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-colors ${i === selectedIndex ? 'bg-indigo-500/10 text-indigo-400' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                    >
                      {doc.type === 'note' ? <FileText size={16} /> : <FileBox size={16} />}
                      <span className="font-medium text-sm line-clamp-1 truncate block">{doc.label}</span>
                    </div>
                  )) : (
                    <div className="px-3 py-4 text-center text-sm text-neutral-500">No matching files found.</div>
                  )}
                </div>
              )}
              {showCommands && (
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider flex justify-between">
                    <span>Commands</span>
                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">Tab</span>
                  </div>
                  {filteredCommands.length > 0 ? filteredCommands.map((cmd, i) => (
                    <div
                      key={cmd.id}
                      onClick={() => insertCompletion(cmd.label)}
                      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-colors ${i === selectedIndex ? 'bg-indigo-500/20 text-indigo-400' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                    >
                      <Command size={16} className={i === selectedIndex ? "text-indigo-400" : "text-neutral-500"} />
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-semibold text-sm leading-none">{cmd.label}</span>
                        <span className="text-xs text-neutral-500 mt-1 line-clamp-1 truncate max-w-full block">{cmd.desc}</span>
                      </div>
                    </div>
                  )) : null}
                </div>
              )}
              {showTools && (
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider flex justify-between">
                    <span>Document Tools</span>
                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">Tab</span>
                  </div>
                  {filteredTools.length > 0 ? filteredTools.map((tool, i) => (
                    <div
                      key={tool.id}
                      onClick={() => insertCompletion(tool.label)}
                      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-colors ${i === selectedIndex ? 'bg-indigo-500/10 text-indigo-400' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                    >
                      <Command size={16} className={i === selectedIndex ? "text-indigo-400" : "text-neutral-500"} />
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-semibold text-sm leading-none">{tool.label}</span>
                        <span className="text-xs text-neutral-500 mt-1 line-clamp-1 truncate max-w-full block">{tool.desc}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="px-3 py-4 text-center text-sm text-neutral-500">No matching tools found.</div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex flex-col w-full bg-neutral-900 border border-neutral-800 focus-within:border-neutral-600 transition-colors rounded-2xl p-2 shadow-2xl">
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
              className="p-3 mr-1 text-neutral-500 hover:text-white transition-colors cursor-pointer rounded-xl flex items-center justify-center"
            >
              <Upload size={18} />
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or use '/' for commands, '@' for notes, '#' for PDF tools..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm px-4 py-3 placeholder-neutral-500 resize-none min-h-[44px] max-h-32 overflow-y-auto leading-relaxed"
              rows={1}
            />
            <button
              onClick={handleSend}
              className="p-3 ml-2 bg-white text-black hover:bg-neutral-200 transition-colors rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0 h-[44px] w-[44px]"
              disabled={!input.trim() || isTyping}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <div className="text-center mt-4">
          <span className="text-[10px] text-neutral-600 opacity-60">AI can make mistakes. Verify important information.</span>
        </div>
      </div>
    </div>
  );
}
