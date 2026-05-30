import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Send, Sparkles, Loader2, CornerDownLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  selectedModelName: string;
  isFree?: boolean;
}

export function ChatInput({ onSend, isStreaming, selectedModelName, isFree }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto grow height of input area
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;

    onSend(input.trim());
    setInput('');
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

  return (
    <div className="space-y-3 max-w-3xl mx-auto w-full select-none" id="chat-input-container">
      {/* Main Form Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className="flex flex-col overflow-hidden rounded-2xl border border-neutral-850 focus-within:border-neutral-700/80 focus-within:ring-1 focus-within:ring-white/10 transition-all duration-350 shadow-xl bg-[#0d0d0d] relative"
        >
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
                disabled={!input.trim() || isStreaming}
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
        </div>
      </form>
    </div>
  );
}
