import { Sliders, X, RotateCcw, ShieldCheck } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl transition-all"
        id="settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/55 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">Model Parameters</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150"
            aria-label="Close settings"
            id="close-settings-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {/* System Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">System Instruction</label>
            <p className="text-xs text-slate-400">
              Steer the model's persona, core limits, response length, language, or tone.
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full min-h-[100px] rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 outline-none transition-all duration-150 font-sans"
              placeholder="e.g. You are a senior software engineer who writes robust and clean Typescript code..."
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-300">Creativity / Temperature</label>
              <span className="text-xs rounded px-2 py-0.5 bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-semibold">
                {temperature.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Higher settings make outputs more unique, while lower is strict, factual and repeatable.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 font-semibold font-mono">0.0 (Strict)</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full bg-slate-950 appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs text-slate-500 font-semibold font-mono">2.0 (Creative)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-300">Max Output Tokens</label>
              <span className="text-xs rounded px-2 py-0.5 bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-semibold">
                {maxTokens}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              The limits on individual answer length (keeps responses under budget or prevents runaway loops).
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 font-semibold font-mono">256</span>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="flex-1 h-1.5 rounded-full bg-slate-950 appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs text-slate-500 font-semibold font-mono">8,192</span>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-950/50 bg-emerald-950/15 text-emerald-600/90 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="leading-normal">
              These hyperparameters apply immediately to all active completions in the current session.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/25 px-6 py-4">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors duration-150 py-1.5 px-3 rounded-lg hover:bg-slate-800"
            id="reset-settings-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          
          <button
            onClick={onClose}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white tracking-wide shadow-lg shadow-emerald-950/50 transition-all duration-150 hover:translate-y-[-1px] active:translate-y-0"
            id="save-settings-btn"
          >
            Apply Parameters
          </button>
        </div>
      </div>
    </div>
  );
}
