import { useState, useEffect, useRef } from 'react';
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
  ArrowDown
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ModelSelector } from './components/ModelSelector';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { MessageRenderer } from './components/MessageRenderer';
import { ChatSession, Message, Model, ProviderId, ServerConfigStatus } from './types';
import { getOptimalModel } from './lib/router';

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
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Model catalog list state
  const [models, setModels] = useState<Model[]>([]);
  const [status, setStatus] = useState<ServerConfigStatus>({
    openrouterConfigured: false,
    nvidiaConfigured: false
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
          // Prefer a free model if available
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
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // If a session has no model selected, or when model selection switches, sync active session parameters
  useEffect(() => {
    if (activeSession) {
      setActiveModelId(activeSession.modelId);
      setActiveProviderId(activeSession.providerId);
      setSystemPrompt(activeSession.systemPrompt);
      setTemperature(activeSession.temperature);
      setMaxTokens(activeSession.maxTokens);
    }
  }, [activeSessionId]);

  // Create a new session
  const handleNewSession = (initialMsg?: string) => {
    const id = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id,
      title: initialMsg ? (initialMsg.length > 30 ? `${initialMsg.substring(0, 30)}...` : initialMsg) : 'New chat thread',
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
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollBottom(!isNearBottom && scrollHeight > clientHeight);
    }
  };

  // Handle key triggers on mount and during message additions
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
        title: userMessageText.substring(0, 30) + (userMessageText.length > 30 ? '...' : ''),
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
      // Keep session model attributes synced if routing selection shifted
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

    // Trigger immediate page follow scroll down
    setTimeout(() => scrollToBottom('smooth'), 50);

    setIsStreaming(true);

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
        throw new Error(errorData.error || `Server responded with issue code ${response.status}`);
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

        // Feed buffer
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        
        // Keep potential half-line for the next decode alignment block
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6);
            try {
              const parsed = JSON.parse(dataStr);
              // Extract content delta (OpenAI streaming format compatibility)
              const chunkContent = parsed.choices?.[0]?.delta?.content || '';
              if (chunkContent) {
                accumulatedContent += chunkContent;
                
                // Update specific assistant message state incrementally
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
              // Gracefully bypass line parse errors from stream pacing cuts
            }
          }
        }
      }

      // Ensure buffer trails are fully read
      if (streamBuffer.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(streamBuffer.substring(6));
          const finalChunk = parsed.choices?.[0]?.delta?.content || '';
          if (finalChunk) {
            accumulatedContent += finalChunk;
          }
        } catch {}
      }

      // Finish streaming and update title if it was a default title and is first message exchange
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          const isDefaultTitle = s.title === 'New chat thread' || s.title.startsWith('New chat thread');
          const finalTitle = isDefaultTitle 
            ? (userMessageText.length > 30 ? `${userMessageText.substring(0, 30)}...` : userMessageText)
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
      setErrorMessage(`Streaming failed: ${err.message}`);
      
      // Update the assistant message with error state
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.map(m => {
              if (m.id === assistantMsgId) {
                return { 
                  ...m, 
                  content: accumulatedContent || `ERROR: Failed to connect or fetch stream. ${err.message}`,
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
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  };

  // Handle updating model settings on dynamic swaps
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

  // Sync hyperparams to active session on changes
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

  const selectedModelObj = models.find(m => m.id === activeModelId && m.provider === activeProviderId) || {
    id: activeModelId,
    name: activeModelId.split('/').pop()?.toUpperCase() || activeModelId || 'Select Model',
    provider: activeProviderId,
    isFree: activeModelId.endsWith(':free')
  };

  return (
    <div className="flex h-screen bg-slate-910 overflow-hidden font-sans text-slate-100" id="main-app-container">
      {/* Sidebar history Drawer */}
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
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="bg-black/60 fixed inset-0 z-30 md:hidden backdrop-blur-xs"
          aria-hidden="true"
        />
      )}

      {/* Main chat workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900" id="chat-workspace">
        {/* Top Navbar */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 py-3.5 px-4 md:px-6 shrink-0 z-10 select-none">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Sidebar"
              id="sidebar-toggle-btn"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
            {/* Tuning control button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
              id="settings-trigger-btn"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Parameters</span>
            </button>
          </div>
        </header>

        {/* Global Warnings Banner */}
        {errorMessage && (
          <div className="bg-rose-950/40 border-b border-rose-900/40 px-6 py-2.5 flex items-center gap-3 text-rose-300 text-xs text-center justify-center animate-in fade-in duration-200">
            <Info className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="font-semibold leading-normal">{errorMessage}</p>
          </div>
        )}

        {/* API warning for unconfigured setup */}
        {!status.openrouterConfigured && !status.nvidiaConfigured && !status.groqConfigured && (
          <div className="bg-amber-950/30 border-b border-amber-900/30 px-6 py-3 flex flex-wrap gap-x-4 gap-y-1.5 items-center justify-center text-amber-250 text-xs text-center select-none">
            <span className="flex items-center gap-1.5 font-bold">
              <KeyRound className="w-4 h-4 text-amber-400" />
              API Key Config Required
            </span>
            <p className="leading-normal max-w-xl">
              Configure your API keys in the **Secrets** panel in the AI Studio UI as **`OPENROUTER_API_KEY`**, **`NVIDIA_API_KEY`**, or **`GROQ_API_KEY`** to access all live models.
            </p>
          </div>
        )}

        {/* Messaging Area */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-8 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-950/40"
          id="chat-feed-box"
        >
          {!activeSession || activeSession.messages.length === 0 ? (
            /* Blank slate template greeting card */
            <div className="max-w-2xl mx-auto py-16 text-center space-y-8 select-none">
              <div className="inline-flex p-4 rounded-3xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 shadow-xl shadow-emerald-950/20">
                <Bot className="w-12 h-12" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-sans">
                  Open-Source ChatGPT
                </h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                  A high-performance full-stack completion environment proxying OpenRouter and NVIDIA NIM APIs in real-time.
                </p>
              </div>

              {/* Status checklist metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4 text-left">
                <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/35 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.openrouterConfigured ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">OpenRouter API</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    {status.openrouterConfigured 
                      ? "Connected! Accessing massive array of direct open-source models immediately."
                      : "Unconfigured. Place key in Secrets to load model weights registry."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/35 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.nvidiaConfigured ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">NVIDIA NIM API</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    {status.nvidiaConfigured 
                      ? "Connected! Deep NVIDIA customized neural architectures are fully active."
                      : "Unconfigured. NVIDIA key will unlock enterprise-ready server microservices."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Chat feed */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div 
                    key={m.id} 
                    className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                    id={`message-container-${m.id}`}
                  >
                    {!isUser && (
                      <div className={`p-1.5 rounded-xl mt-1 shrink-0 ${
                        m.providerUsed === 'nvidia' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' 
                          : 'bg-indigo-950 text-indigo-400 border border-indigo-800/50'
                      }`}>
                        <Bot className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                      </div>
                    )}

                    <div className={`max-w-[85%] md:max-w-[77%] rounded-2xl px-4 py-3 md:px-5 md:py-3.5 shadow-md ${
                      isUser 
                        ? 'bg-emerald-600 border border-emerald-500 text-white rounded-tr-none' 
                        : m.error 
                          ? 'bg-rose-950/30 border border-rose-900/50 text-rose-200'
                          : 'bg-slate-950/80 border border-slate-800/50 text-slate-100 rounded-tl-none'
                    }`}>
                      {/* Message metadata details */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-800/40 select-none">
                          <span>{m.modelUsed?.split('/').pop() || 'Model'}</span>
                          <span>•</span>
                          <span>{m.providerUsed === 'nvidia' ? 'NVIDIA NIM' : 'OpenRouter'}</span>
                          {m.wasAutoRouted && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-450 bg-amber-950/40 border border-amber-900/30 px-1 py-0.5 rounded font-extrabold text-[8.5px]">
                                <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                Smart Routed
                              </span>
                            </>
                          )}
                          {isStreaming && m.content === '' && (
                            <span className="text-emerald-400 animate-pulse font-sans ml-auto">Thinking...</span>
                          )}
                        </div>
                      )}

                      {/* Content block */}
                      <MessageRenderer content={m.content} />
                      
                      {/* Message Footer stats */}
                      <div className="flex items-center justify-end text-[9px] font-mono text-slate-500 mt-2 select-none">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Floater arrow back to bottom */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom()}
            className="fixed bottom-28 md:bottom-24 right-6 md:right-8 p-2.5 rounded-xl bg-slate-955 border border-slate-800 text-slate-400 hover:text-white shadow-xl hover:bg-slate-900 transition-colors z-20 cursor-pointer animate-bounce select-none"
            title="Scroll to bottom"
            id="scroll-bottom-floater"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Quick input console */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-slate-950/85 to-transparent shrink-0">
          <ChatInput
            onSend={handleSendMessage}
            isStreaming={isStreaming}
            selectedModelName={selectedModelObj.name}
            isFree={selectedModelObj.isFree}
          />
        </div>
      </div>

      {/* Settings Panel parameters slider drawer modal */}
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
    </div>
  );
}
