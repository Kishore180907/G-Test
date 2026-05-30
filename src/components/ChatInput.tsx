import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Send, Sparkles, Loader2, Compass } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  selectedModelName: string;
  isFree?: boolean;
}

const SAMPLE_PROMPTS = [
  { text: "Write a high-performance Express server-side route in TypeScript", category: "Code" },
  { text: "Help me write an elegant marketing copy explaining open-source LLMs", category: "Writing" },
  { text: "What's the difference between OpenRouter and NVIDIA microservices?", category: "Explain" }
];

export function ChatInput({ onSend, isStreaming, selectedModelName, isFree }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto grow height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
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
    <div className="space-y-4" id="chat-input-container">
      {/* Quick starter suggestion chips - only visible if textbox is empty */}
      {input.trim() === '' && (
        <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto px-4 select-none">
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(prompt.text);
                textareaRef.current?.focus();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-300 text-xs hover:border-emerald-500/30 hover:text-white transition-all cursor-pointer text-left"
              id={`preset-prompt-${idx}`}
            >
              <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                {prompt.category}
              </span>
              <span className="truncate max-w-[240px] md:max-w-xs">{prompt.text}...</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Form structure */}
      <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/80 transition-all duration-150 shadow-2xl">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
            placeholder={`Ask ${selectedModelName}...`}
            className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm text-slate-100 placeholder-slate-500 outline-none max-h-[200px]"
            style={{ minHeight: '44px' }}
            id="chat-textarea"
          />

          {/* Floating Actions Utilities bar */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-t border-slate-800/40 select-none text-[10px]">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Model: <span className="text-slate-200 font-semibold">{selectedModelName}</span></span>
              </span>
              {isFree && (
                <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-850/40">
                  FREE
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-mono font-bold">
                {input.length} chars
              </span>
              
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-35 disabled:hover:bg-emerald-600 disabled:translate-y-0 hover:translate-y-[-1px] select-none cursor-pointer"
                id="submit-prompt-btn"
                aria-label="Send message"
              >
                {isStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Short advice footer */}
        <p className="text-center text-[10px] text-slate-500 mt-2 tracking-wide select-none">
          Supports Markdown tables, bold elements, and lists. Shift + Enter for newline.
        </p>
      </form>
    </div>
  );
}
