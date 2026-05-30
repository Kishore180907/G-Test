import { useState, useMemo, useEffect, useRef } from 'react';
import { Cpu, Search, Sparkles, AlertCircle, RefreshCw, Check, ChevronDown, Wand2, Info } from 'lucide-react';
import { Model, ProviderId, ServerConfigStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

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
  const [activeTab, setActiveTab] = useState<'all' | 'openrouter' | 'nvidia' | 'generic-chat-completion-api'>('all');
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
      custom: models.filter(m => m.provider === 'generic-chat-completion-api' && (routingMode !== 'smart-free' || m.isFree)).length
    };
  }, [models, routingMode]);

  return (
    <div className="relative" ref={dropdownRef} id="model-selector-wrapper">
      {/* Target Selector Action button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl border border-neutral-900 bg-neutral-900/60 hover:bg-neutral-900 text-neutral-200 hover:text-white transition-all duration-200 text-xs font-semibold outline-none cursor-pointer w-[230px] sm:w-[285px]"
        id="model-selector-trigger"
        type="button"
      >
        <div className="flex items-center gap-2 overflow-hidden w-full">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            routingMode !== 'manual'
              ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
              : currentModel?.provider === 'nvidia' 
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                : currentModel?.provider === 'generic-chat-completion-api'
                  ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                  : 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
          }`}>
            {routingMode !== 'manual' ? (
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            ) : (
              <Cpu className="w-3.5 h-3.5" />
            )}
          </div>
          
          <div className="overflow-hidden text-left flex-1">
            <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest leading-none mb-0.5">
              {routingMode === 'smart-free' 
                ? 'Routing: Smart Free' 
                : routingMode === 'smart-any' 
                  ? 'Routing: Smart Any' 
                  : currentModel?.provider === 'nvidia' 
                    ? 'NVIDIA NIM' 
                    : currentModel?.provider === 'generic-chat-completion-api'
                      ? 'Custom Groq API'
                      : 'OpenRouter'}
            </span>
            <span className="block font-bold truncate leading-snug text-neutral-100 text-[11px]">
              {routingMode === 'smart-free' 
                ? 'Optimal Auto-Choice (Free)' 
                : routingMode === 'smart-any' 
                  ? 'Optimal Auto-Choice (Any)' 
                  : currentModel?.name || selectedModelId || 'Select a Model'}
            </span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 select-none ml-2" />
      </button>

      {/* Dropdown Menu Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2.5 w-[310px] sm:w-[410px] rounded-2xl border border-neutral-900 bg-neutral-950 shadow-2xl overflow-hidden z-50"
            id="model-selector-dropdown"
          >
            {/* AI Smart Router controller */}
            <div className="p-3 bg-neutral-900/30 border-b border-neutral-905 space-y-2">
              <div className="flex items-center justify-between gap-2.5">
                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  Hyper Smart Routing
                </span>
                <span className="text-[8px] font-black bg-purple-950/60 text-purple-300 border border-purple-900/40 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  SaaS Gateway
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onRoutingModeChange('manual')}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border outline-none cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    routingMode === 'manual'
                      ? 'bg-neutral-900 text-white border-neutral-800 shadow-lg shadow-black/25'
                      : 'bg-neutral-950/40 text-neutral-500 border-transparent hover:bg-neutral-900/40 hover:text-neutral-350'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Manual Choice</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRoutingModeChange('smart-free')}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border outline-none cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    routingMode === 'smart-free'
                      ? 'bg-purple-950/20 text-purple-300 border-purple-900/50 shadow-lg shadow-purple-950/10'
                      : 'bg-neutral-950/40 text-neutral-500 border-transparent hover:bg-neutral-900/40 hover:text-neutral-350'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Free Models</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRoutingModeChange('smart-any')}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border outline-none cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    routingMode === 'smart-any'
                      ? 'bg-blue-950/20 text-blue-300 border-blue-900/50 shadow-lg shadow-blue-950/10'
                      : 'bg-neutral-950/40 text-neutral-500 border-transparent hover:bg-neutral-900/40 hover:text-neutral-350'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>All Models</span>
                </button>
              </div>
              
              <div className="flex items-center gap-1.5 text-[9.5px] text-neutral-500 leading-normal bg-neutral-900/10 px-2 py-1 rounded">
                <Info className="w-3 h-3 text-neutral-550 shrink-0" />
                <p className="leading-snug">
                  {routingMode === 'manual' && "Choose any explicit client-side model manually below."}
                  {routingMode === 'smart-free' && "Automatically resolves queries to optimized, fast Free LLMs."}
                  {routingMode === 'smart-any' && "Deep queries invoke massive premier units. Simple calls save bandwidth."}
                </p>
              </div>
            </div>

            {/* Models search input */}
            <div className="p-2.5 bg-neutral-950 border-b border-neutral-905 flex items-center justify-between gap-2.5 select-none">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 font-medium" />
                <input
                  type="text"
                  placeholder={routingMode === 'smart-free' ? "Filter free instances..." : "Search model directory..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-[11px] rounded-lg border border-neutral-900 bg-neutral-900/35 text-neutral-200 placeholder-neutral-500 focus:border-purple-500/60 focus:outline-none transition-all"
                  id="model-search-input"
                />
              </div>
              
              <button
                maxLength={60}
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshModels();
                }}
                disabled={isLoadingModels}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-all shrink-0 disabled:opacity-40 select-none cursor-pointer border border-transparent hover:border-neutral-805"
                title="Refresh API configuration directory"
                id="refresh-models-btn"
                type="button"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>

            {/* Tabs selection */}
            <div className="flex flex-wrap gap-1 bg-neutral-950/70 border-b border-neutral-905 p-1.5 select-none">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'all' 
                    ? 'bg-neutral-900 text-white border border-neutral-800' 
                    : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-900/30 border border-transparent'
                }`}
              >
                All ({providerCounts.all})
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('openrouter')}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'openrouter' 
                    ? 'bg-purple-950/30 text-purple-300 border border-purple-900/40' 
                    : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-900/30 border border-transparent'
                }`}
              >
                OpenRouter ({providerCounts.openrouter})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('nvidia')}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'nvidia' 
                    ? 'bg-emerald-950/30 text-emerald-350 border border-emerald-900/40' 
                    : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-900/30 border border-transparent'
                }`}
              >
                NVIDIA ({providerCounts.nvidia})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('generic-chat-completion-api')}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'generic-chat-completion-api' 
                    ? 'bg-amber-950/35 text-amber-350 border border-amber-900/40' 
                    : 'text-neutral-500 hover:text-neutral-350 hover:bg-neutral-900/30 border border-transparent'
                }`}
              >
                Custom Groq ({providerCounts.custom})
              </button>
            </div>

            {/* List entries */}
            <div className="max-h-[290px] overflow-y-auto divide-y divide-neutral-905 scrollbar-thin">
              {filteredModels.length === 0 ? (
                <div className="p-8 text-center space-y-2.5">
                  <AlertCircle className="w-7 h-7 text-neutral-600 mx-auto" />
                  <span className="block text-xs text-neutral-350 font-bold">No instances discovered</span>
                  <p className="text-[10px] text-neutral-550 text-neutral-500 max-w-[260px] mx-auto leading-relaxed">
                    Try swapping active directory channels, or configure your keys inside AI Studio under the Secrets menu.
                  </p>
                </div>
              ) : (
                filteredModels.map((m) => {
                  const isSelected = selectedModelId === m.id && selectedProviderId === m.provider;
                  return (
                    <button
                      key={`${m.provider}-${m.id}`}
                      type="button"
                      onClick={() => {
                        onSelect(m.id, m.provider);
                        setIsOpen(false);
                      }}
                      className={`w-full p-3 text-left transition-all duration-200 flex items-start gap-3 relative cursor-pointer outline-none ${
                        isSelected 
                          ? 'bg-neutral-900/65' 
                          : 'hover:bg-neutral-900/30'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute right-4.5 top-4 text-purple-400" id={`tick-active-${m.id}`}>
                          <Check className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 border ${
                        m.provider === 'nvidia' 
                          ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-450' 
                          : m.provider === 'generic-chat-completion-api'
                            ? 'bg-amber-950/30 border-amber-900/30 text-amber-445'
                            : 'bg-purple-950/30 border-purple-900/30 text-purple-450'
                      }`}>
                        <Cpu className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-neutral-100 text-[11.5px] truncate max-w-[180px]">
                            {m.name}
                          </span>
                          {m.isFree && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-950/60 text-purple-400 border border-purple-900/40 select-none leading-none">
                              FREE
                            </span>
                          )}
                        </div>
                        
                        <span className="block text-[8.5px] font-mono text-neutral-500 font-medium truncate mt-0.5 select-all uppercase tracking-normal">
                          {m.id}
                        </span>
                        
                        {m.description && (
                          <p className="text-[10px] text-neutral-400 line-clamp-2 mt-1 leading-normal select-none">
                            {m.description}
                          </p>
                        )}
                        
                        {m.contextLength && (
                          <span className="inline-block text-[9px] text-neutral-550 text-neutral-500 mt-1 font-mono select-none">
                            Context window: {m.contextLength.toLocaleString()} tokens
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            
            {/* Quick footer helper */}
            <div className="p-3 bg-neutral-950 border-t border-neutral-905 text-[9.5px] text-neutral-500 flex items-center justify-between select-none font-medium">
              <span>Proxied cloud API gateways active.</span>
              <span className="text-purple-400 font-bold">100% Secure Node</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
