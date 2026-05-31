import { Sliders, X, RotateCcw, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  setSystemPrompt: (val: string) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  maxTokens: number;
  setMaxTokens: (val: number) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  systemPrompt,
  setSystemPrompt,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleReset = () => {
    setSystemPrompt("You are an intelligent, helpful, and concise AI assistant.");
    setTemperature(0.7);
    setMaxTokens(2048);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Background close overlay */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0c] shadow-2xl relative z-10 font-sans flex flex-col"
        id="settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0a0a0c] px-6 py-4.5 select-none animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4.5 h-4.5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-tight font-display">Configuration Parameters</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/[0.03] hover:text-white transition-all duration-150 cursor-pointer select-none border border-transparent hover:border-white/[0.04]"
            aria-label="Close settings"
            id="close-settings-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5.5 text-left flex-1 overflow-y-auto">
          {/* System Instruction */}
          <div className="space-y-2">
            <div className="flex items-center justify-between select-none">
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">System Role Instructions</label>
              <HelpCircle className="w-3.5 h-3.5 text-neutral-500 cursor-help" title="These instructions control the voice, level of detail, and behavior constraints of the AI." />
            </div>
            <p className="text-[11px] text-neutral-550 text-neutral-500 leading-normal select-none">
              Determine the custom persona, response lengths, language preferences, or guardrails of answers.
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full min-h-[105px] rounded-xl border border-white/[0.04] bg-white/[0.01] focus:bg-white/[0.02] px-3.5 py-3 text-xs text-neutral-200 placeholder-neutral-600 focus:border-white/[0.12] focus:outline-none transition-all leading-relaxed"
              placeholder="e.g. You are an expert engineer who writes modern TypeScript with strict type-safety..."
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between select-none">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Temperature / Creativity</label>
              <span className="text-[10px] rounded-lg px-2 py-0.5 bg-white/[0.02] border border-white/[0.04] font-mono text-indigo-400 font-bold">
                {temperature.toFixed(1)}
              </span>
            </div>
            <p className="text-[11px] text-neutral-550 text-neutral-500 leading-normal select-none">
              Unlocks richer, highly imaginative answers on higher levels, or factual, repeatable output on lower levels.
            </p>
            <div className="flex items-center gap-4 select-none pt-1">
              <span className="text-[10px] text-neutral-500 font-semibold font-mono">0.0 (Strict)</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 font-semibold font-mono">2.0 (Creative)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between select-none">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Max Generation Size</label>
              <span className="text-[10px] rounded-lg px-2 py-0.5 bg-white/[0.02] border border-white/[0.04] font-mono text-indigo-400 font-bold">
                {maxTokens} tokens
              </span>
            </div>
            <p className="text-[11px] text-neutral-550 text-neutral-500 leading-normal select-none">
              The exact budget limits of the output. Higher counts permit long-form paragraphs or major codebases.
            </p>
            <div className="flex items-center gap-4 select-none pt-1">
              <span className="text-[10px] text-neutral-500 font-semibold font-mono">256</span>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 font-semibold font-mono">8k (Long)</span>
            </div>
          </div>

          {/* Guidelines notes */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] text-neutral-450 text-[11px] select-none">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tuned configs are applied instantly to active completions. You may reset them anytime.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.04] bg-[#0a0a0c] px-6 py-4 select-none">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-all py-1.5 px-3 rounded-lg hover:bg-white/[0.03] cursor-pointer border border-transparent hover:border-white/[0.04]"
            id="reset-settings-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="font-semibold">Reset Defaults</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-indigo-600 border border-indigo-500/20 text-white font-semibold text-xs px-4 py-2.5 hover:bg-indigo-500 transition-all cursor-pointer shadow-lg active:scale-95 duration-100"
            id="save-settings-btn"
          >
            Apply Configurations
          </button>
        </div>
      </motion.div>
    </div>
  );
}
