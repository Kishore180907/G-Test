import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, 
  Sparkles, 
  Menu, 
  X, 
  Settings, 
  KeyRound, 
  HelpCircle, 
  Info,
  ChevronDown,
  Cpu,
  RefreshCw,
  Clock,
  ArrowDown,
  Keyboard,
  Zap,
  Activity,
  Trash2,
  Trash,
  Check,
  Terminal,
  FileCode,
  LineChart,
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ModelSelector } from './components/ModelSelector';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { MessageRenderer } from './components/MessageRenderer';
import { ChatSession, Message, Model, ProviderId, ServerConfigStatus } from './types';
import { getOptimalModel } from './lib/router';
import { motion, AnimatePresence } from 'motion/react';

const SUGGESTED_CARDS = [
  {
    title: "Coding Workspace",
    prompt: "Write a high-performance Express server-side route in TypeScript",
    category: "Code",
    description: "Write clean schemas, parse formats, or mock APIs.",
    color: "from-purple-500/20 to-blue-500/20 text-purple-400"
  },
  {
    title: "Technical Writing",
    prompt: "Help me write an elegant marketing copy explaining open-source LLMs",
    category: "Writing",
    description: "Compose summaries, draft copies, or outline documents.",
    color: "from-blue-500/20 to-indigo-500/20 text-blue-400"
  },
  {
    title: "Deep Analysis & Tech",
    prompt: "Compare the difference between OpenRouter and NVIDIA microservices",
    category: "Explain",
    description: "Examine infrastructure layers, specs, or benchmark reports.",
    color: "from-indigo-500/20 to-violet-500/20 text-indigo-400"
  },
  {
    title: "Data Operations",
    prompt: "Help me write a Python script to filter and summarize CSV columns",
    category: "Data",
    description: "Analyze stats, formulate math equations, or parse lists.",
    color: "from-pink-500/20 to-rose-500/20 text-pink-400"
  },
  {
    title: "Marketing Campaign",
    prompt: "Craft a social media plan outline for launching an offline-first mobile app",
    category: "Marketing",
    description: "Design social copy, newsletter headlines, or brand ideas.",
    color: "from-orange-500/20 to-amber-500/20 text-amber-400"
  },
  {
    title: "Strategic Blueprint",
    prompt: "Compare SaaS pricing tiers and design a tier-based expansion model",
    category: "Business",
    description: "Brainstorm strategic pillars, tiers, or expansion indexes.",
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-400"
  }
];

export default function App() {
  // Session history loading with safe localStorage parsing
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('open_chat_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('open_chat_active_id');
      return savedId || '';
    } catch {
      return '';
    }
  });

  // Hyperparameters
  const [systemPrompt, setSystemPrompt] = useState('You are an intelligent, helpful, and concise AI assistant.');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Layout UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Real-time rolling generation timer state
  const [streamDuration, setStreamDuration] = useState<number>(0);
  const streamTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);

  // Model catalog list state
  const [models, setModels] = useState<Model[]>([]);
  const [status, setStatus] = useState<ServerConfigStatus>({
    openrouterConfigured: false,
    nvidiaConfigured: false,
    groqConfigured: false,
    geminiConfigured: false
  });

  // Current selected model
  const [activeModelId, setActiveModelId] = useState('');
  const [activeProviderId, setActiveProviderId] = useState<ProviderId>('openrouter');
  
  // Model Smart AI Routing Mode state ('manual' | 'smart-free' | 'smart-any')
  const [routingMode, setRoutingMode] = useState<'manual' | 'smart-free' | 'smart-any'>(() => {
    try {
      const saved = localStorage.getItem('open_chat_routing_mode');
      return (saved as 'manual' | 'smart-free' | 'smart-any') || 'manual';
    } catch {
      return 'manual';
    }
  });

  useEffect(() => {
    localStorage.setItem('open_chat_routing_mode', routingMode);
  }, [routingMode]);

  // Multi-device scroll controllers
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Sync sessions with localStorage
  useEffect(() => {
    localStorage.setItem('open_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('open_chat_active_id', activeSessionId);
  }, [activeSessionId]);

  // Initial Fetch: Status configuration and available model lists
  useEffect(() => {
    fetchStatus();
    fetchModels();
    
    // Auto-collapse sidebar on smaller screens initially
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to locate cloud runtime status.', err);
    }
  };

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data: Model[] = await res.json();
        setModels(data);
        
        // Select an initial default model if none is selected
        if (data.length > 0) {
          const freeModel = data.find(m => m.isFree);
          const initialModel = freeModel || data[0];
          setActiveModelId(initialModel.id);
          setActiveProviderId(initialModel.provider);
        }
      } else {
        setErrorMessage('Failed to query models from the backend proxy service.');
      }
    } catch (err: any) {
      setErrorMessage(`Network error fetching models directory: ${err.message}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Setup active session details
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId);
  }, [sessions, activeSessionId]);

  // Sync parameters when active session swaps
  useEffect(() => {
    if (activeSession) {
      setActiveModelId(activeSession.modelId);
      setActiveProviderId(activeSession.providerId);
      setSystemPrompt(activeSession.systemPrompt);
      setTemperature(activeSession.temperature);
      setMaxTokens(activeSession.maxTokens);
    }
  }, [activeSessionId]);

  // Create keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: dismiss modal Dialogues
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
      }
      // Ctrl + , or Cmd + , : Tuning Modal
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      // Ctrl + / or Cmd + / : Shortcuts list modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
      // Ctrl + K or Cmd + K : trigger New Chat thread
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleNewSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessions, activeSessionId, activeModelId, activeProviderId, systemPrompt, temperature, maxTokens]);

  // Create a new session
  const handleNewSession = (initialMsg?: string) => {
    const id = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id,
      title: initialMsg ? (initialMsg.length > 25 ? `${initialMsg.substring(0, 25)}...` : initialMsg) : 'New chat thread',
      modelId: activeModelId || 'google/gemma-4-31b-it:free',
      providerId: activeProviderId || 'openrouter',
      systemPrompt,
      temperature,
      maxTokens,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    setErrorMessage('');
    return id;
  };

  // Delete an individual session from history
  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else {
        setActiveSessionId('');
      }
    }
  };

  // Clear all chats from localStorage
  const handleClearAll = () => {
    if (confirm('Are you absolutely sure you want to clear all chat histories? This is permanent.')) {
      setSessions([]);
      setActiveSessionId('');
      localStorage.removeItem('open_chat_sessions');
      localStorage.removeItem('open_chat_active_id');
    }
  };

  // Scroll to bottom trigger
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll visibility check
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShowScrollBottom(!isNearBottom && scrollHeight > clientHeight);
    }
  };

  // Move to bottom on session changes
  useEffect(() => {
    scrollToBottom('instant');
  }, [activeSessionId]);

  // Streaming completion initiator
  const handleSendMessage = async (userMessageText: string) => {
    setErrorMessage('');
    let sessionId = activeSessionId;
    let currentSession = sessions.find(s => s.id === sessionId);

    // Determine target model coordinates using smart-routing if enabled
    let modelToUse = activeModelId;
    let providerToUse = activeProviderId;

    if (routingMode !== 'manual') {
      const constraint = routingMode === 'smart-free' ? 'free' : 'any';
      const optimal = getOptimalModel(userMessageText, constraint, models);
      modelToUse = optimal.id;
      providerToUse = optimal.provider;
    }

    // Create session automatically on first message compose
    if (!currentSession) {
      sessionId = handleNewSession(userMessageText);
      currentSession = {
        id: sessionId,
        title: userMessageText.substring(0, 25) + (userMessageText.length > 25 ? '...' : ''),
        modelId: modelToUse,
        providerId: providerToUse,
        systemPrompt,
        temperature,
        maxTokens,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    } else {
      if (routingMode !== 'manual' || currentSession.modelId !== activeModelId || currentSession.providerId !== activeProviderId) {
        currentSession.modelId = modelToUse;
        currentSession.providerId = providerToUse;
      }
    }

    // Append user message
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessageText,
      timestamp: Date.now()
    };

    // Placeholder for assistant response block
    const assistantMsgId = `msg-${Date.now()}-assistant`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '', // streaming builds this up
      timestamp: Date.now(),
      modelUsed: modelToUse,
      providerUsed: providerToUse,
      wasAutoRouted: routingMode !== 'manual'
    };

    const updatedMessages = [...currentSession.messages, userMsg];

    // Local state pre-update
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          modelId: modelToUse,
          providerId: providerToUse,
          messages: [...updatedMessages, assistantMsg],
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    setTimeout(() => scrollToBottom('smooth'), 50);

    setIsStreaming(true);
    setLastResponseTime(null);
    setStreamDuration(0);

    // Start precision rolling timer
    const pStart = performance.now();
    streamTimerIntervalRef.current = setInterval(() => {
      setStreamDuration(parseFloat(((performance.now() - pStart) / 1000).toFixed(1)));
    }, 100);

    let accumulatedContent = '';
    const matchingModel = models.find(m => m.id === modelToUse && m.provider === providerToUse);
    const customModelInfo = matchingModel?.customModel;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: updatedMessages,
          modelId: modelToUse,
          providerId: providerToUse,
          temperature: currentSession.temperature,
          maxTokens: currentSession.maxTokens,
          systemPrompt: currentSession.systemPrompt,
          customModel: customModelInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error calling proxy stream completions.' }));
        let finalErrorMsg = '';
        if (errorData?.error) {
          if (typeof errorData.error === 'object' && errorData.error !== null) {
            finalErrorMsg = errorData.error.message || JSON.stringify(errorData.error);
          } else {
            finalErrorMsg = errorData.error;
          }
        } else {
          finalErrorMsg = `Server responded with issue code ${response.status}`;
        }
        throw new Error(finalErrorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error('Streaming body is unreadable on browser request.');
      }

      let streamBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6);
            try {
              const parsed = JSON.parse(dataStr);
              const chunkContent = parsed.choices?.[0]?.delta?.content || '';
              if (chunkContent) {
                accumulatedContent += chunkContent;
                
                setSessions(prev => prev.map(s => {
                  if (s.id === sessionId) {
                    return {
                      ...s,
                      messages: s.messages.map(m => {
                        if (m.id === assistantMsgId) {
                          return { ...m, content: accumulatedContent };
                        }
                        return m;
                      })
                    };
                  }
                  return s;
                }));
              }
            } catch (err) {
              // Bypassed parsing lines error
            }
          }
        }
      }

      if (streamBuffer.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(streamBuffer.substring(6));
          const finalChunk = parsed.choices?.[0]?.delta?.content || '';
          if (finalChunk) {
            accumulatedContent += finalChunk;
          }
        } catch {}
      }

      // Finish Timer calculation
      const durationTotal = parseFloat(((performance.now() - pStart) / 1000).toFixed(2));
      setLastResponseTime(durationTotal);

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          const isDefaultTitle = s.title === 'New chat thread' || s.title.startsWith('New chat thread');
          const finalTitle = isDefaultTitle 
            ? (userMessageText.length > 25 ? `${userMessageText.substring(0, 25)}...` : userMessageText)
            : s.title;

          return {
            ...s,
            title: finalTitle,
            messages: s.messages.map(m => {
              if (m.id === assistantMsgId) {
                return { ...m, content: accumulatedContent || "No response received." };
              }
              return m;
            })
          };
        }
        return s;
      }));

    } catch (err: any) {
      console.error('Completion error: ', err);
      const errString = err instanceof Error 
        ? err.message 
        : (typeof err === 'object' && err !== null ? (err.message || JSON.stringify(err)) : String(err));
      setErrorMessage(`Streaming failed: ${errString}`);
      
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.map(m => {
              if (m.id === assistantMsgId) {
                return { 
                  ...m, 
                  content: accumulatedContent || `ERROR: Failed to connect stream. ${errString}`,
                  error: true 
                };
              }
              return m;
            })
          };
        }
        return s;
      }));
    } finally {
      setIsStreaming(false);
      if (streamTimerIntervalRef.current) {
        clearInterval(streamTimerIntervalRef.current);
        streamTimerIntervalRef.current = null;
      }
      setTimeout(() => scrollToBottom('smooth'), 120);
    }
  };

  const handleModelSelect = (modelId: string, providerId: ProviderId) => {
    setActiveModelId(modelId);
    setActiveProviderId(providerId);

    if (activeSession) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            modelId,
            providerId,
            updatedAt: Date.now()
          };
        }
        return s;
      }));
    }
  };

  // Sync hyperparams
  const handleUpdateSystemPrompt = (prompt: string) => {
    setSystemPrompt(prompt);
    if (activeSession) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, systemPrompt: prompt };
        }
        return s;
      }));
    }
  };

  const handleUpdateTemperature = (temp: number) => {
    setTemperature(temp);
    if (activeSession) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, temperature: temp };
        }
        return s;
      }));
    }
  };

  const handleUpdateMaxTokens = (tokens: number) => {
    setMaxTokens(tokens);
    if (activeSession) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, maxTokens: tokens };
        }
        return s;
      }));
    }
  };

  const selectedModelObj = useMemo(() => {
    return models.find(m => m.id === activeModelId && m.provider === activeProviderId) || {
      id: activeModelId,
      name: activeModelId.split('/').pop()?.toUpperCase() || activeModelId || 'Select Model',
      provider: activeProviderId,
      isFree: activeModelId.endsWith(':free')
    };
  }, [models, activeModelId, activeProviderId]);

  // Total session stats calculations
  const activeSessionStats = useMemo(() => {
    if (!activeSession) return { count: 0, chars: 0, tokens: 0 };
    let chars = 0;
    activeSession.messages.forEach(m => chars += m.content.length);
    const tokens = Math.ceil(chars / 4);
    return {
      count: activeSession.messages.length,
      chars,
      tokens
    };
  }, [activeSession]);

  const hasConfiguredKeys = status.openrouterConfigured || status.nvidiaConfigured || status.groqConfigured;

  return (
    <div className="flex h-screen bg-[#070708] overflow-hidden font-sans text-neutral-200 select-none antialiased" id="main-app-container">
      
      {/* Sidebar Thread Navigation */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
      }`}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            if (window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          onNewSession={() => {
            handleNewSession();
            if (window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          onDeleteSession={handleDeleteSession}
          onClearAll={handleClearAll}
          status={status}
        />
      </div>

      {/* Backdrop overlay for mobile drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="bg-black/80 fixed inset-0 z-30 md:hidden backdrop-blur-xs"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main chat workspace area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0b]" id="chat-workspace">
        
        {/* Top bar navbar */}
        <header className="flex items-center justify-between border-b border-neutral-900 bg-[#070708]/75 py-3 px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-all cursor-pointer border border-transparent hover:border-neutral-850"
              aria-label="Toggle Navigation Sidebar"
              id="sidebar-toggle-btn"
              type="button"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Selector wrapper */}
            <ModelSelector
              models={models}
              selectedModelId={activeModelId}
              selectedProviderId={activeProviderId}
              onSelect={handleModelSelect}
              status={status}
              onRefreshModels={fetchModels}
              isLoadingModels={isLoadingModels}
              routingMode={routingMode}
              onRoutingModeChange={setRoutingMode}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Systems active telemetry dot */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-900 bg-neutral-900/10 text-neutral-400 text-[10px] font-bold tracking-wider">
              <span className={`w-1.5 h-1.5 rounded-full ${hasConfiguredKeys ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'}`} />
              <span className="uppercase">{hasConfiguredKeys ? 'API Gateways Online' : 'Systems Active (Demo)'}</span>
            </div>

            {/* Keyboard Shortcuts Trigger Button */}
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="p-1.5 rounded-xl border border-neutral-900 bg-[#0d0d0e]/50 text-neutral-400 hover:text-white transition-all cursor-pointer hover:border-neutral-800"
              title="View Keyboard Shortcuts"
              id="shortcuts-trigger-btn"
              type="button"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Tuning parameter controls */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-900 hover:border-neutral-800 bg-[#0d0d0e]/50 hover:bg-neutral-905 text-neutral-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
              id="settings-trigger-btn"
              type="button"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Parameters</span>
            </button>
          </div>
        </header>

        {/* Global Warnings Panel */}
        {errorMessage && (
          <div className="bg-red-950/20 border-b border-red-900/30 px-6 py-2.5 flex items-center gap-3 text-red-300 text-xs text-center justify-center animate-in slide-in-from-top-1">
            <Info className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
            <p className="font-semibold leading-normal">{errorMessage}</p>
          </div>
        )}

        {/* Messaging & Canvas viewport */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-neutral-900"
          id="chat-feed-box"
        >
          {!activeSession || activeSession.messages.length === 0 ? (
            
            /* EMPTY STATE SCREEN - AURA REDESIGN */
            <div className="max-w-2xl mx-auto py-12 md:py-20 text-center space-y-8 select-none">
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="space-y-4"
              >
                {/* Central Sparkling custom AI mark */}
                <div className="relative inline-flex items-center justify-center p-5 rounded-3xl bg-neutral-900/30 border border-neutral-850 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-blue-500/10 to-indigo-500/10 animate-pulse" />
                  <Sparkles className="w-10 h-10 text-purple-400" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    How can I help you today?
                  </h2>
                  <p className="text-neutral-500 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
                    Welcome to Aura Workspace. Type your question or choose one of the quick start action cards to test prompts.
                  </p>
                </div>
              </motion.div>

              {/* Suggestions Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto pt-4 text-left">
                {SUGGESTED_CARDS.map((card, idx) => (
                  <motion.button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestedPrompt(card.prompt)}
                    whileHover={{ scale: 1.015, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 rounded-xl border border-neutral-900 hover:border-neutral-800 bg-[#0a0a0b]/40 hover:bg-neutral-900/30 text-left transition-all duration-200 cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{card.category}</span>
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-tr ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <h4 className="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors">{card.title}</h4>
                    <p className="text-[10.5px] text-neutral-500 leading-normal line-clamp-2">{card.description}</p>
                  </motion.button>
                ))}
              </div>

              {/* Subtle cluster metrics label */}
              <div className="pt-2 select-none">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-900/60 bg-[#0d0d0e]/30 text-neutral-500 text-[10px] font-mono leading-none">
                  <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                  <span>Secure Node: {selectedModelObj.provider || 'api'} active proxy route</span>
                </span>
              </div>

            </div>
          ) : (
            
            /* CHAT MESSAGE FEED WRAPPER */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <motion.div 
                    key={m.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.05, 0.2) }}
                    className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                    id={`message-container-${m.id}`}
                  >
                    {!isUser && (
                      <div className={`p-1.5 rounded-xl mt-1 shrink-0 bg-neutral-900 border border-neutral-850 shadow-md ${
                        m.providerUsed === 'nvidia' 
                          ? 'text-emerald-450 border-emerald-900/30' 
                          : 'text-purple-450 border-purple-900/30'
                      }`}>
                        <Bot className="w-4 h-4 md:w-4.5 md:h-4.5" />
                      </div>
                    )}

                    <div className={`max-w-[88%] md:max-w-[78%] rounded-2xl px-4 py-3.5 md:px-5.5 md:py-4 shadow-xl relative ${
                      isUser 
                        ? 'bg-[#111112] border border-neutral-850 text-white rounded-tr-none' 
                        : m.error 
                          ? 'bg-red-950/20 border border-red-900/40 text-red-300'
                          : 'bg-[#0d0d0e]/95 border border-neutral-900 text-neutral-200 rounded-tl-none'
                    }`}>
                      
                      {/* Telemetry metadata tags for Assistant responses */}
                      {!isUser && (
                        <div className="flex items-center gap-2 text-[9px] font-medium font-mono text-neutral-500 uppercase tracking-widest mb-3 pb-1.5 border-b border-neutral-900/50 select-none">
                          <span className="text-neutral-450 font-bold">{m.modelUsed?.split('/').pop() || 'Aura Agent'}</span>
                          <span>•</span>
                          <span>
                            {m.providerUsed === 'nvidia' 
                              ? 'NVIDIA NIM' 
                              : m.providerUsed === 'generic-chat-completion-api'
                                ? 'GROQ API'
                                : 'OpenRouter'}
                          </span>
                          {m.wasAutoRouted && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-purple-400 bg-purple-950/20 border border-purple-905 px-1 rounded font-black text-[8px]">
                                <Sparkles className="w-2.5 h-2.5" />
                                Smart Routed
                              </span>
                            </>
                          )}
                          
                          {/* Live rolling streaming indicator */}
                          {isStreaming && idx === activeSession.messages.length - 1 && (
                            <span className="ml-auto inline-flex items-center gap-1.5 text-purple-400 font-bold animate-pulse text-[8.5px]">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>Generating {streamDuration}s</span>
                            </span>
                          )}

                          {/* Completed stats timing */}
                          {!isStreaming && idx === activeSession.messages.length - 1 && lastResponseTime && (
                            <span className="ml-auto text-neutral-500 text-[8.5px]">
                              Took {lastResponseTime}s
                            </span>
                          )}
                        </div>
                      )}

                      {/* Content parsing block */}
                      <MessageRenderer content={m.content} />
                      
                      {/* Footer telemetry details (estimate length / timestamp) */}
                      <div className="flex items-center justify-between text-[9px] font-mono font-medium text-neutral-600 mt-3 select-none">
                        <span className="flex items-center gap-1 uppercase tracking-wide">
                          <span>{m.content.length} Character{(m.content.length === 1 ? '' : 's')}</span>
                          <span>•</span>
                          <span>{Math.ceil(m.content.length / 4)} EST. Tokens</span>
                        </span>
                        
                        <span className="flex items-center font-bold">
                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Back-to-bottom hover floater button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom()}
            className="fixed bottom-26 right-6 md:right-8 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white shadow-2xl hover:bg-neutral-850 transition-all z-20 cursor-pointer animate-none select-none hover:scale-105 active:scale-95"
            title="Scroll to bottom of chat history"
            id="scroll-bottom-floater"
            type="button"
          >
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </button>
        )}

        {/* Main query input console footer layout panel */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-neutral-950/90 to-transparent shrink-0">
          <ChatInput
            onSend={handleSendMessage}
            isStreaming={isStreaming}
            selectedModelName={selectedModelObj.name}
            isFree={selectedModelObj.isFree}
          />
        </div>
      </div>

      {/* Model Parameter configuration modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemPrompt={systemPrompt}
        setSystemPrompt={handleUpdateSystemPrompt}
        temperature={temperature}
        setTemperature={handleUpdateTemperature}
        maxTokens={maxTokens}
        setMaxTokens={handleUpdateMaxTokens}
      />

      {/* KEYBOARD SHORTCUT HELPER LIST MODAL */}
      <AnimatePresence>
        {isShortcutsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="absolute inset-0 cursor-default" onClick={() => setIsShortcutsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950 shadow-2xl relative z-10 font-sans p-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4.5 h-4.5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">Keyboard Workspace Shortcuts</h3>
                </div>
                <button
                  onClick={() => setIsShortcutsOpen(false)}
                  className="rounded-lg p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer select-none"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 select-none text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">New Workspace Thread</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Ctrl</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">K</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Tuning Parameters Selector</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Ctrl</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">,</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Open / Dismiss Shortcuts Modal</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Ctrl</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">/</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-900 pt-3 mt-3.5">
                  <span className="text-neutral-400 font-medium">Auto-scroll Active Feed</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Esc</kbd>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center select-none pt-2 border-t border-neutral-900">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Press escape to dismiss modal</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  // Helper handle prompt card selects
  function handleSelectSuggestedPrompt(promptText: string) {
    handleSendMessage(promptText);
  }
}
