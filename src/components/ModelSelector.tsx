import { useState, useMemo, useEffect, useRef } from 'react';
import { Cpu, Search, Sparkles, AlertCircle, RefreshCw, KeyRound, Check, HelpCircle, ChevronDown } from 'lucide-react';
import { Model, ProviderId, ServerConfigStatus } from '../types';

interface ModelSelectorProps {
  models: Model[];
  selectedModelId: string;
  selectedProviderId: ProviderId;
  onSelect: (modelId: string, providerId: ProviderId) => void;
  status: ServerConfigStatus;
  onRefreshModels: () => void;
  isLoadingModels: boolean;
  routingMode: 'manual' | 'smart-free' | 'smart-any';
  onRoutingModeChange: (mode: 'manual' | 'smart-free' | 'smart-any') => void;
}

export function ModelSelector({
  models,
  selectedModelId,
  selectedProviderId,
  onSelect,
  status,
  onRefreshModels,
  isLoadingModels,
  routingMode,
  onRoutingModeChange
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'openrouter' | 'nvidia' | 'generic-chat-completion-api' | 'gemini' | 'offline'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = useMemo(() => {
    return models.find(m => m.id === selectedModelId && m.provider === selectedProviderId) || 
           models.find(m => m.id === selectedModelId) || 
           models[0];
  }, [models, selectedModelId, selectedProviderId]);

  // Filter models
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      // If free models only constraint is enabled, show only free models
      if (routingMode === 'smart-free' && !m.isFree) return false;

      // Filter by provider
      if (activeTab !== 'all' && m.provider !== activeTab) return false;

      // Filter by search query
      if (search.trim()) {
        const query = search.toLowerCase();
        return m.id.toLowerCase().includes(query) || 
               (m.name && m.name.toLowerCase().includes(query)) ||
               (m.description && m.description.toLowerCase().includes(query));
      }

      return true;
    });
  }, [models, activeTab, search, routingMode]);

  const providerCounts = useMemo(() => {
    return {
      all: models.filter(m => routingMode !== 'smart-free' || m.isFree).length,
      openrouter: models.filter(m => m.provider === 'openrouter' && (routingMode !== 'smart-free' || m.isFree)).length,
      nvidia: models.filter(m => m.provider === 'nvidia' && (routingMode !== 'smart-free' || m.isFree)).length,
      custom: models.filter(m => m.provider === 'generic-chat-completion-api' && (routingMode !== 'smart-free' || m.isFree)).length,
      gemini: models.filter(m => m.provider === 'gemini' && (routingMode !== 'smart-free' || m.isFree)).length,
      offline: models.filter(m => m.provider === 'offline' && (routingMode !== 'smart-free' || m.isFree)).length
    };
  }, [models, routingMode]);

  return (
    <div className="relative" ref={dropdownRef} id="model-selector-wrapper">
      {/* Target selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-900 text-slate-100 transition-all font-sans text-sm outline-none cursor-pointer text-left w-full sm:w-[305px]"
        id="model-selector-trigger"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            routingMode !== 'manual'
              ? 'bg-amber-950/85 text-amber-400 border border-amber-800/50 animate-pulse'
              : currentModel?.provider === 'gemini'
                ? 'bg-purple-950/80 text-purple-400 border border-purple-800/40'
                : currentModel?.provider === 'offline'
                  ? 'bg-slate-950/85 text-slate-400 border border-slate-800/50'
                  : currentModel?.provider === 'nvidia' 
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' 
                    : currentModel?.provider === 'generic-chat-completion-api'
                      ? 'bg-amber-955/40 text-amber-400 border border-amber-800/50'
                      : 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/40'
          }`}>
            {routingMode !== 'manual' ? <Sparkles className="w-4 h-4 text-amber-400" /> : <Cpu className="w-4 h-4" />}
          </div>
          <div className="overflow-hidden">
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
              {routingMode === 'smart-free' 
                ? 'Auto-Router: Free' 
                : routingMode === 'smart-any' 
                  ? 'Auto-Router: Any' 
                  : currentModel?.provider === 'gemini'
                    ? 'Google Gemini'
                    : currentModel?.provider === 'offline'
                      ? 'Offline Demo'
                      : currentModel?.provider === 'nvidia' 
                        ? 'NVIDIA NIM' 
                        : currentModel?.provider === 'generic-chat-completion-api'
                          ? 'Custom API (Groq)'
                          : 'OpenRouter'}
            </span>
            <span className="block font-semibold truncate leading-tight text-white text-xs">
              {routingMode === 'smart-free' 
                ? 'Optimal Free Model' 
                : routingMode === 'smart-any' 
                  ? 'Optimal Model (Any)' 
                  : currentModel?.name || selectedModelId || 'Select a Model'}
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 select-none" />
      </button>

      {/* Model inventory dropdown popup */}
      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-2 w-screen max-w-[340px] sm:max-w-[430px] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          id="model-selector-dropdown"
        >
          {/* Smart Router Controller Row */}
          <div className="p-3 bg-slate-950/90 border-b border-slate-850 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 select-none">
                <Sparkles className="w-3.5 h-3.5 text-amber-450 shrink-0 animate-pulse" />
                AI Smart Model Router
              </span>
              <span className="text-[9px] bg-emerald-955/60 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded font-extrabold select-none">
                ACCORDING TO PLAN
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onRoutingModeChange('manual')}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border outline-none cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  routingMode === 'manual'
                    ? 'bg-slate-850 text-white border-slate-700 shadow-sm'
                    : 'bg-slate-950/40 text-slate-400 border-transparent hover:bg-slate-850/30 hover:text-slate-300'
                }`}
                title="Select model manually"
              >
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                <span>Manual Choice</span>
              </button>

              <button
                onClick={() => onRoutingModeChange('smart-free')}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border outline-none cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  routingMode === 'smart-free'
                    ? 'bg-amber-955/30 text-amber-300 border-amber-800 shadow-sm'
                    : 'bg-slate-950/40 text-slate-400 border-transparent hover:bg-slate-850/30 hover:text-slate-300'
                }`}
                title="AI router picks best free model based on your question"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Free Models Only</span>
              </button>

              <button
                onClick={() => onRoutingModeChange('smart-any')}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border outline-none cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  routingMode === 'smart-any'
                    ? 'bg-emerald-955/30 text-emerald-300 border-emerald-800 shadow-sm'
                    : 'bg-slate-950/40 text-slate-400 border-transparent hover:bg-slate-850/30 hover:text-slate-300'
                }`}
                title="AI router picks best model (free or paid) based on your question"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Any Models</span>
              </button>
            </div>
            
            <p className="text-[9.5px] text-slate-450 leading-relaxed text-center select-none pt-0.5">
              {routingMode === 'manual' && "Choose your model manually from the list below."}
              {routingMode === 'smart-free' && "Filters list to Free-only. If query is technical/math, routes to strong Free models."}
              {routingMode === 'smart-any' && "Deep queries route to elite models (e.g. DeepSeek R1). Simple tasks lease fast Free models."}
            </p>
          </div>

          {/* Search bar */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-850 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={routingMode === 'smart-free' ? "Search free models..." : "Search models..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-850 bg-slate-955 text-slate-200 placeholder-slate-600 focus:border-emerald-500 outline-none transition-all"
                id="model-search-input"
              />
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefreshModels();
              }}
              disabled={isLoadingModels}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 disabled:opacity-40 select-none cursor-pointer"
              title="Refresh available models"
              id="refresh-models-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Provider tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-800 p-1.5 bg-slate-950/20 select-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-slate-800 text-white border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35 border border-transparent'
              }`}
            >
              All ({providerCounts.all})
            </button>
            <button
              onClick={() => setActiveTab('gemini')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'gemini' 
                  ? 'bg-purple-950/50 border border-purple-800/40 text-purple-350' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35 border border-transparent'
              }`}
            >
              Gemini ({providerCounts.gemini})
            </button>
            <button
              onClick={() => setActiveTab('openrouter')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'openrouter' 
                  ? 'bg-indigo-950/50 border border-indigo-800/40 text-indigo-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35 border border-transparent'
              }`}
            >
              OpenRouter ({providerCounts.openrouter})
            </button>
            <button
              onClick={() => setActiveTab('nvidia')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'nvidia' 
                  ? 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35 border border-transparent'
              }`}
            >
              NVIDIA ({providerCounts.nvidia})
            </button>
            <button
              onClick={() => setActiveTab('generic-chat-completion-api')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'generic-chat-completion-api' 
                  ? 'bg-amber-955/20 border border-amber-800/40 text-amber-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35 border border-transparent'
              }`}
            >
              Custom ({providerCounts.custom})
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'offline' 
                  ? 'bg-slate-950 border border-slate-700/55 text-slate-350 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35 border border-transparent'
              }`}
            >
              Demo ({providerCounts.offline})
            </button>
          </div>

          {/* Setup verification tags */}
          <div className="px-3.5 py-2 border-b border-slate-800/50 bg-slate-950/15 flex flex-wrap gap-x-3.5 gap-y-1.5 justify-start text-[9.5px]">
            <span className="flex items-center gap-1">
              <KeyRound className={`w-3 h-3 ${status.geminiConfigured ? 'text-purple-400 shrink-0' : 'text-slate-500 shrink-0'}`} />
              <span className={status.geminiConfigured ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                Gemini: {status.geminiConfigured ? 'Active (Auto)' : 'Unconfigured'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <KeyRound className={`w-3 h-3 ${status.openrouterConfigured ? 'text-emerald-500 shrink-0' : 'text-slate-500 shrink-0'}`} />
              <span className={status.openrouterConfigured ? 'text-slate-300' : 'text-slate-500'}>
                OpenRouter: {status.openrouterConfigured ? 'Active' : 'Unconfigured'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <KeyRound className={`w-3 h-3 ${status.nvidiaConfigured ? 'text-emerald-500 shrink-0' : 'text-slate-500 shrink-0'}`} />
              <span className={status.nvidiaConfigured ? 'text-slate-300' : 'text-slate-500'}>
                NVIDIA: {status.nvidiaConfigured ? 'Active' : 'Unconfigured'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <KeyRound className={`w-3 h-3 ${status.groqConfigured ? 'text-emerald-500 shrink-0' : 'text-slate-500 shrink-0'}`} />
              <span className={status.groqConfigured ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                Groq: {status.groqConfigured ? 'Active' : 'Unconfigured'}
              </span>
            </span>
          </div>

          {/* Model listing container */}
          <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-800/40 divide-dashed scrollbar-thin">
            {filteredModels.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <span className="block text-xs text-slate-400 font-semibold">No models match filters</span>
                <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                  Try swapping tabs or verify if your keys (**`OPENROUTER_API_KEY`**, **`NVIDIA_API_KEY`**, or **`GROQ_API_KEY`**) are configured in the Secrets panel in AI Studio.
                </p>
              </div>
            ) : (
              filteredModels.map((m) => {
                const isSelected = selectedModelId === m.id && selectedProviderId === m.provider;
                return (
                  <button
                    key={`${m.provider}-${m.id}`}
                    onClick={() => {
                      onSelect(m.id, m.provider);
                      setIsOpen(false);
                    }}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 relative cursor-pointer outline-none ${
                      isSelected 
                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30' 
                        : 'hover:bg-slate-850/40'
                    }`}
                  >
                    {/* Selected state tick marker */}
                    {isSelected && (
                      <div className="absolute right-4 top-4 text-emerald-500" id={`tick-active-${m.id}`}>
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      m.provider === 'gemini'
                        ? 'bg-purple-950/60 text-purple-450 border border-purple-800/40'
                        : m.provider === 'offline'
                          ? 'bg-slate-950/80 text-slate-400 border border-slate-700/50'
                          : m.provider === 'nvidia' 
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/30' 
                            : m.provider === 'generic-chat-completion-api'
                              ? 'bg-amber-955/35 text-amber-400 border border-amber-800/40'
                              : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/30'
                    }`}>
                      <Cpu className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-100 text-xs truncate max-w-[200px]">
                          {m.name}
                        </span>
                        {m.isFree && (
                          <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-850 select-none">
                            FREE
                          </span>
                        )}
                        {m.provider === 'offline' && (
                          <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-705 text-slate-400 select-none">
                            DEMO
                          </span>
                        )}
                        {m.provider === 'gemini' && (
                          <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-purple-950 border border-purple-800 text-purple-400 select-none animate-pulse">
                            GEMINI
                          </span>
                        )}
                        {m.provider === 'nvidia' && (
                          <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-900 border border-emerald-700 text-white select-none">
                            NVIDIA
                          </span>
                        )}
                        {m.provider === 'generic-chat-completion-api' && (
                          <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-950 border border-amber-800 text-amber-400 select-none">
                            GROQ
                          </span>
                        )}
                      </div>
                      <span className="block text-[9px] font-mono text-slate-500 font-medium truncate mt-0.5 select-all">
                        {m.id}
                      </span>
                      {m.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-normal">
                          {m.description}
                        </p>
                      )}
                      {m.contextLength && (
                        <span className="inline-block text-[9px] text-slate-500 mt-1.5 font-mono select-none">
                          Context size: {m.contextLength.toLocaleString()} tokens
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Quick instructions panel */}
          <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between select-none">
            <span>Choose any compatible model for instant chat proxying.</span>
            <span className="font-semibold text-emerald-400">Open and Free API Client</span>
          </div>
        </div>
      )}
    </div>
  );
}
