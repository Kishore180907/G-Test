import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Search, Command, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export function CommandPalette({ isOpen, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter actions based on search query
  const filtered = actions.filter((act) =>
    act.label.toLowerCase().includes(query.toLowerCase())
  );

  // Auto-focus input when opened, and reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle global Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Navigate up/down/enter via keyboard in the filtered listing
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) {
        filtered[activeIndex].action();
      }
    }
  };

  // Keep highlighted item in view inside scroll container
  useEffect(() => {
    if (listRef.current) {
      const parent = listRef.current;
      const activeEl = parent.children[activeIndex] as HTMLElement;
      if (activeEl) {
        const top = activeEl.offsetTop;
        const bottom = top + activeEl.offsetHeight;
        const parentTop = parent.scrollTop;
        const parentBottom = parentTop + parent.offsetHeight;

        if (bottom > parentBottom) {
          parent.scrollTop = bottom - parent.offsetHeight;
        } else if (top < parentTop) {
          parent.scrollTop = top;
        }
      }
    }
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/80 backdrop-blur-md pt-[15vh]">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0d10] shadow-2xl relative z-10 flex flex-col"
          >
            {/* Input Row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] bg-[#07070a]/40">
              <Search className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search command actions (e.g., Focus Mode, Export...)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 outline-none leading-relaxed"
              />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/[0.04] bg-white/[0.02] text-[10px] text-neutral-500 font-mono font-bold select-none">
                <Command className="w-2.5 h-2.5" />
                <span>P</span>
              </div>
            </div>

            {/* List Actions Area */}
            <div
              ref={listRef}
              className="max-h-[310px] overflow-y-auto p-1.5 space-y-0.5 select-none scrollbar-thin"
            >
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 font-medium">
                  No command actions matched search query
                </div>
              ) : (
                filtered.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.action()}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium cursor-pointer transition-all duration-150 relative ${
                        isActive
                          ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-white/10 text-white'
                              : 'bg-white/[0.03] text-neutral-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{item.label}</span>
                      </div>

                      {/* Shortcut or navigation enter tip */}
                      <div className="flex items-center gap-2">
                        {item.shortcut ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold select-none border lowercase ${
                              isActive
                                ? 'bg-white/15 text-indigo-100 border-white/10'
                                : 'bg-white/[0.02] text-neutral-500 border-white/[0.04]'
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        ) : null}
                        {isActive && (
                          <CornerDownLeft className="w-3 h-3 text-indigo-200/50" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Action Footer Navigation Instructions */}
            <div className="border-t border-white/[0.04] px-4 py-2 bg-neutral-950/40 flex items-center justify-between text-[10px] text-neutral-500 font-medium select-none">
              <span className="flex items-center gap-1.5">
                <span>↑↓ navigate</span>
                <span>•</span>
                <span>⏎ select</span>
              </span>
              <span>esc to abort</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
