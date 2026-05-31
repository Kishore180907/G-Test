import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Send, Sparkles, CornerDownLeft, Square, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  selectedModelName: string;
  isFree?: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, isStreaming, selectedModelName, isFree, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice recognition states & ref
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto grow height of input area
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(prev => (prev.trim() ? prev.trim() + ' ' : '') + transcript);
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Turn off mic if streaming starts
  useEffect(() => {
    if (isStreaming && isListening) {
      recognitionRef.current?.stop();
    }
  }, [isStreaming, isListening]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) {
      if (onStop) onStop();
      return;
    }
    if (!input.trim()) return;

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
      {isStreaming && onStop && (
        <div className="flex justify-center mb-1 animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.06] bg-neutral-950/95 text-neutral-300 hover:text-white hover:bg-[#0d0d10] text-xs font-semibold select-none cursor-pointer transition-all shadow-md active:scale-95 duration-150"
            id="stop-generating-btn"
          >
            <Square className="w-2.5 h-2.5 fill-red-400 stroke-red-400 shrink-0" />
            <span>Cancel Generation</span>
          </button>
        </div>
      )}

      {/* Main Form Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.04] focus-within:border-white/[0.12] focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all duration-350 shadow-2xl glass relative"
        >
          {/* Waveform Speech Indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/5 border-b border-white/[0.04]"
              >
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div 
                      key={i} 
                      className="w-0.5 bg-red-400 rounded-full"
                      animate={{ height: [4, 12, 6, 16, 4] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }} 
                    />
                  ))}
                </div>
                <span className="text-[11px] text-red-400 font-semibold tracking-wide">Speech Terminal Listening...</span>
              </motion.div>
            )}
          </AnimatePresence>

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
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-950/40 border-t border-white/[0.04] select-none text-[10px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-neutral-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400/80 shrink-0" />
                  <span>Model: <span className="text-neutral-350 font-semibold">{selectedModelName}</span></span>
                </span>
                {isFree && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 tracking-wider">
                    FREE
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Token Estimator */}
              {input.length > 0 && (
                <span className="text-neutral-500 font-mono font-medium tracking-wide">
                  ~{Math.ceil(input.length / 4)} tokens
                </span>
              )}

              {/* Voice input button */}
              <button
                type="button"
                onClick={toggleVoice}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isListening 
                    ? 'text-red-400 bg-red-500/15 border border-red-500/30' 
                    : 'text-neutral-500 hover:text-white hover:bg-white/[0.04]'
                }`}
                title={isListening ? "Stop voice listening" : "Talk via Web Speech microphone"}
              >
                {isListening ? (
                  <MicOff className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Submit prompt button */}
              <motion.button
                type="submit"
                disabled={!input.trim() && !isStreaming}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center justify-center w-7.5 h-7.5 rounded-xl transition-all select-none cursor-pointer ${
                  isStreaming 
                    ? 'bg-white text-black hover:bg-neutral-100' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-20 disabled:hover:scale-100 disabled:bg-indigo-650'
                }`}
                id="submit-prompt-btn"
                aria-label={isStreaming ? "Stop message" : "Send message"}
              >
                {isStreaming ? (
                  <Square className="w-3 h-3 fill-current stroke-current" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Short inline help advice shortcut footer */}
        <div className="flex items-center justify-between px-1.5 mt-2 text-[10px] text-neutral-500 select-none tracking-normal">
          <span className="flex items-center gap-1 bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.04] max-sm:hidden">
            <CornerDownLeft className="w-2.5 h-2.5" />
            <span>Press Enter to send</span>
          </span>
          <span>Shift + Enter for new lines</span>
        </div>
      </form>
    </div>
  );
}

