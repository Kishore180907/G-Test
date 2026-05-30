import { useState, useRef, useEffect, FormEvent, KeyboardEvent, DragEvent, ChangeEvent } from 'react';
import { Send, Sparkles, Loader2, Paperclip, X, FileText, Check, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  selectedModelName: string;
  isFree?: boolean;
}

interface FileAttachment {
  name: string;
  size?: number;
  type?: string;
  content?: string;
}

export function ChatInput({ onSend, isStreaming, selectedModelName, isFree }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto grow height of input area
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;

    let payload = input.trim();
    if (attachments.length > 0) {
      const attachmentsBlock = attachments.map(att => {
        if (att.content) {
          return `\n\n--- FILE ATTACHMENT: ${att.name} ---\n\`\`\`\n${att.content}\n\`\`\``;
        } else {
          return `\n\n--- FILE ATTACHMENT: ${att.name} --- [Unsupported binary file structure]`;
        }
      }).join('\n');
      payload += attachmentsBlock;
    }

    onSend(payload);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Drag and Drop files handling
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileRead = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      // Check file size, safe limit (e.g., 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Choose files under 2 MB.");
        return;
      }

      const reader = new FileReader();
      const isText = file.type.startsWith('text/') || 
                     file.name.endsWith('.js') || 
                     file.name.endsWith('.ts') || 
                     file.name.endsWith('.tsx') || 
                     file.name.endsWith('.jsx') || 
                     file.name.endsWith('.json') || 
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.css') ||
                     file.name.endsWith('.html') ||
                     file.name.endsWith('.py') ||
                     file.name.endsWith('.sh');

      if (isText) {
        reader.onload = (e) => {
          setAttachments(prev => [...prev, {
            name: file.name,
            size: file.size,
            type: file.type,
            content: e.target?.result as string
          }]);
        };
        reader.readAsText(file);
      } else {
        // Just store name/size for unsupported binary files
        setAttachments(prev => [...prev, {
          name: file.name,
          size: file.size,
          type: file.type
        }]);
      }
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileRead(e.dataTransfer.files);
  };

  const handleManualUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileRead(e.target.files);
    e.target.value = ''; // Reset input to re-trigger same file upload
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3 max-w-3xl mx-auto w-full select-none" id="chat-input-container">
      {/* Hidden manual input */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Main Form Area */}
      <form onSubmit={handleSubmit} className="relative">
        {/* Border dragging overlay glow & outline feedback */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col overflow-hidden rounded-2xl border transition-all duration-350 shadow-xl bg-[#0d0d0d] relative ${
            isDragging 
              ? 'border-purple-500 ring-2 ring-purple-500/20 scale-[1.015]' 
              : 'border-neutral-850 focus-within:border-neutral-700/80 focus-within:ring-1 focus-within:ring-white/10'
          }`}
        >
          {/* Active File dragging cover view */}
          <AnimatePresence>
            {isDragging && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-purple-950/20 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-purple-500 rounded-2xl pointer-events-none"
              >
                <div className="p-3 bg-purple-600 rounded-xl shadow-lg relative animate-bounce">
                  <Paperclip className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-xs font-bold mt-2.5">Drop files to augment your prompt</span>
                <span className="text-purple-300 text-[10px] mt-1 font-mono">Compatible with text, code, JSON, Markdown</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List of active attachments if any */}
          {attachments.length > 0 && (
            <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 border-b border-neutral-900 bg-neutral-950/40">
              {attachments.map((att, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10.5px] font-semibold text-neutral-300 group"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate max-w-[120px] font-medium leading-none mt-0.5">{att.name}</span>
                  <span className="text-[9px] text-neutral-500 font-mono leading-none mt-0.5 shrink-0">
                    {att.size ? `(${(att.size / 1024).toFixed(1)} KB)` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer select-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Input field area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
              placeholder={`Ask aura to solve, write, or search anything ...`}
              className="w-full resize-none bg-transparent px-4 py-4 pr-14 text-sm text-neutral-100 placeholder-neutral-500 outline-none max-h-[220px] min-h-[50px] leading-relaxed"
              id="chat-textarea"
            />
          </div>

          {/* Input control sub-utilities panel */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-950/80 border-t border-neutral-905 select-none text-[10px]">
            <div className="flex items-center gap-3">
              {/* Paperclip attachment triggers */}
              <button
                type="button"
                onClick={handleManualUpload}
                disabled={isStreaming}
                className="p-1.5 rounded-lg border border-neutral-900 bg-neutral-900/50 text-neutral-400 hover:text-white hover:border-neutral-800 transition-all cursor-pointer flex items-center justify-center select-none"
                title="Attach code context files"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 text-neutral-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400/80 shrink-0" />
                  <span>Model: <span className="text-neutral-300 font-semibold">{selectedModelName}</span></span>
                </span>
                {isFree && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-purple-950/55 text-purple-400 border border-purple-900/40 tracking-wider">
                    FREE
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              {/* Char indicators */}
              <span className="text-neutral-500 font-mono font-medium tracking-wide">
                {input.length} chars
              </span>

              {/* Submit prompt button */}
              <motion.button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isStreaming}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center w-7.5 h-7.5 rounded-xl bg-white text-black transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:bg-white select-none cursor-pointer hover:bg-neutral-100"
                id="submit-prompt-btn"
                aria-label="Send message"
              >
                {isStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Short inline help advice shortcut footer */}
        <div className="flex items-center justify-between px-1.5 mt-2 text-[10px] text-neutral-500 select-none tracking-normal">
          <span className="flex items-center gap-1 bg-neutral-900/40 px-1.5 py-0.5 rounded border border-neutral-900 max-sm:hidden">
            <CornerDownLeft className="w-2.5 h-2.5" />
            <span>Press Enter to send</span>
          </span>
          <span>Shift + Enter for new lines</span>
          <span>Drag-and-drop context files to assist</span>
        </div>
      </form>
    </div>
  );
}
