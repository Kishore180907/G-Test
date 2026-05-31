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
  Bookmark,
  Copy,
  Eye,
  EyeOff,
  BookOpen,
  Download,
  Sliders
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ModelSelector } from './components/ModelSelector';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { MessageRenderer } from './components/MessageRenderer';
import { LegalModal } from './components/LegalModals';
import { CommandPalette, CommandAction } from './components/CommandPalette';
import { PromptLibrary } from './components/PromptLibrary';
import { ChatSession, Message, Model, ProviderId, ServerConfigStatus, PromptTemplate } from './types';
import { getOptimalModel } from './lib/router';
import { motion, AnimatePresence } from 'motion/react';

const SUGGESTED_CARDS = [
  {
    title: "Code Optimization",
    prompt: "Write a clean TypeScript debounce or throttle utility function with explanation",
    category: "Practical Code",
    description: "Avoid redundant updates, throttle scroll events, or model inputs."
  },
  {
    title: "Architecture Guide",
    prompt: "Contrast SQL relational scaling vs NoSQL document store trade-offs",
    category: "System Design",
    description: "Compare indexing speeds, ACID compliance, and vertical vs horizontal growth."
  },
  {
    title: "Parsers & Automation",
    prompt: "Write a Python script to parse a directory of Markdown files and list all links",
    category: "Automation",
    description: "Automate report audits, extract references quickly, or find broken URLs."
  }
];

function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 hover:bg-neutral-850 rounded text-neutral-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[9.5px] select-none"
      title="Copy message contents"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-semibold text-[9.5px]">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-neutral-500 shrink-0" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

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
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'tos' | 'privacy'>('tos');

  // Premium Features States
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isFocusModeActive, setIsFocusModeActive] = useState(() => {
    try {
      return localStorage.getItem('aura_focus_mode_active') === 'true';
    } catch {
      return false;
    }
  });

  const [customPrompts, setCustomPrompts] = useState<PromptTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('aura_custom_prompts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync Focus Mode & Custom Prompts to storage
  useEffect(() => {
    localStorage.setItem('aura_focus_mode_active', String(isFocusModeActive));
  }, [isFocusModeActive]);

  useEffect(() => {
    localStorage.setItem('aura_custom_prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Esc: dismiss modal Dialogues and deactivate focus mode if desired
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsCommandPaletteOpen(false);
        setIsPromptLibraryOpen(false);
      }
      // Ctrl + Shift + P or Cmd + Shift + P : Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // F10 : Toggle Focus Mode
      if (e.key === 'F10') {
        e.preventDefault();
        setIsFocusModeActive(prev => !prev);
      }
      // F9 : Toggle Sidebar
      if (e.key === 'F9') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      // Ctrl + B or Cmd + B : Open Prompt blueprints
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsPromptLibraryOpen(prev => !prev);
      }
      // Ctrl + E or Cmd + E : Export conversation json string
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExportHistory();
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
  }, [sessions, activeSessionId, activeModelId, activeProviderId, systemPrompt, temperature, maxTokens, isFocusModeActive, isSidebarOpen]);

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

  // Export current conversation history (JSON format)
  const handleExportHistory = () => {
    if (!activeSession) {
      alert("No active session selected to export.");
      return;
    }
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeSession, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `aura_thread_${activeSession.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Export thread session error: ", err);
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

  const handleOpenToS = () => {
    setLegalModalType('tos');
    setLegalModalOpen(true);
  };

  const handleOpenPrivacy = () => {
    setLegalModalType('privacy');
    setLegalModalOpen(true);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    if (streamTimerIntervalRef.current) {
      clearInterval(streamTimerIntervalRef.current);
      streamTimerIntervalRef.current = null;
    }
  };

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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
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
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        return;
      }
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
      abortControllerRef.current = null;
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

  const commandActions: CommandAction[] = useMemo(() => [
    {
      id: 'focus-mode',
      label: isFocusModeActive ? 'Deactivate High Performance Focus Mode' : 'Activate High Performance Focus Mode',
      shortcut: 'f10',
      icon: Eye,
      action: () => {
        setIsFocusModeActive(prev => !prev);
        setIsCommandPaletteOpen(false);
      }
    },
    {
      id: 'prompt-library',
      label: 'Open Prompt blueprints library',
      shortcut: 'ctrl+b',
      icon: BookOpen,
      action: () => {
        setIsPromptLibraryOpen(true);
        setIsCommandPaletteOpen(false);
      }
    },
    {
      id: 'new-chat',
      label: 'New Thread workspace session',
      shortcut: 'ctrl+k',
      icon: Zap,
      action: () => {
        handleNewSession();
        setIsCommandPaletteOpen(false);
      }
    },
    {
      id: 'parameters',
      label: 'Configure Model Hyperparameters',
      shortcut: 'ctrl+,',
      icon: Settings,
      action: () => {
        setIsSettingsOpen(true);
        setIsCommandPaletteOpen(false);
      }
    },
    {
      id: 'shortcuts',
      label: 'View keyboard command short-cuts',
      shortcut: 'ctrl+/',
      icon: Keyboard,
      action: () => {
        setIsShortcutsOpen(true);
        setIsCommandPaletteOpen(false);
      }
    },
    {
      id: 'export-history',
      label: 'Export Thread Completion to JSON',
      shortcut: 'ctrl+e',
      icon: Download,
      action: () => {
        handleExportHistory();
        setIsCommandPaletteOpen(false);
      }
    },
    {
      id: 'clear-all',
      label: 'Permanent Cleansing of Workspace Thread history',
      shortcut: 'danger',
      icon: Trash2,
      action: () => {
        handleClearAll();
        setIsCommandPaletteOpen(false);
      }
    }
  ], [isFocusModeActive, sessions, activeSessionId, activeModelId, activeProviderId, systemPrompt, temperature, maxTokens]);

  return (
    <div className="flex h-screen bg-[#070708] overflow-hidden font-sans text-neutral-200 select-none antialiased" id="main-app-container">
      
      {/* Sidebar Thread Navigation */}
      {!isFocusModeActive && (
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
            onOpenToS={handleOpenToS}
            onOpenPrivacy={handleOpenPrivacy}
          />
        </div>
      )}

      {/* Backdrop overlay for mobile drawer */}
      <AnimatePresence>
        {isSidebarOpen && !isFocusModeActive && (
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
        {!isFocusModeActive ? (
          <header className="flex items-center justify-between border-b border-white/[0.04] bg-[#070708]/75 py-3 px-4 md:px-6 shrink-0 z-10 transition-colors">
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
              {/* Status indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.04] bg-white/[0.01]/10 text-neutral-400 text-[10px] font-semibold select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Systems Online</span>
              </div>

              {/* Keyboard Shortcuts Trigger Button */}
              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="p-1.5 rounded-xl border border-white/[0.04] bg-white/[0.01]/50 text-neutral-400 hover:text-white transition-all cursor-pointer hover:border-white/[0.08]"
                title="View Keyboard Shortcuts"
                id="shortcuts-trigger-btn"
                type="button"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              {/* Tuning parameter controls */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.04] hover:border-white/[0.08] bg-white/[0.01]/50 hover:bg-white/[0.03] text-neutral-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                id="settings-trigger-btn"
                type="button"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Parameters</span>
              </button>
            </div>
          </header>
        ) : (
          <div className="absolute top-4 right-4 z-40 select-none flex items-center gap-2">
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-white/[0.04] bg-[#07070a]/60 backdrop-blur-md text-xs text-neutral-400 shadow-md font-sans"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 bg-indigo-500 animate-pulse" />
                <span className="font-semibold text-neutral-300 font-display">Focus Mode Active</span>
              </div>
              <span className="text-neutral-600">|</span>
              <button 
                onClick={() => setIsFocusModeActive(false)}
                className="font-bold text-indigo-455 text-indigo-400 hover:text-indigo-300 hover:underline transition-all cursor-pointer font-display"
              >
                Exit Focus (F10)
              </button>
            </motion.div>
          </div>
        )}

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
                <div className="relative inline-flex items-center justify-center p-5 rounded-3xl bg-neutral-900/40 border border-neutral-850 shadow-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
                  <Sparkles className="w-10 h-10 text-indigo-400" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    How can I help you today?
                  </h2>
                  <p className="text-neutral-500 text-xs md:text-sm max-w-sm mx-auto leading-relaxed">
                    Welcome to Aura Workspace. Choose one of our practical action cards or type custom inquiries into the terminal.
                  </p>
                </div>
              </motion.div>

              {/* Suggestions Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto pt-4 text-left">
                {SUGGESTED_CARDS.map((card, idx) => (
                  <motion.button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestedPrompt(card.prompt)}
                    whileHover={{ scale: 1.015, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 rounded-xl border border-neutral-900 hover:border-indigo-505/30 bg-[#0d0d0e]/40 hover:bg-neutral-900/30 text-left transition-all duration-200 cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{card.category}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors">{card.title}</h4>
                    <p className="text-[10.5px] text-neutral-500 leading-normal line-clamp-2">{card.description}</p>
                  </motion.button>
                ))}
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
                      <div className="p-1.5 rounded-xl mt-1 shrink-0 bg-neutral-900 border border-neutral-850 shadow-md text-indigo-400">
                        <Bot className="w-4 h-4 md:w-4.5" />
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
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 select-none border-b border-neutral-900/60 pb-1.5 mb-2 px-1 font-sans">
                          <span className="font-semibold text-neutral-400 capitalize flex items-center gap-1.5">
                            {(m.modelUsed || 'Aura Model').split('/').pop()?.replace(':free', '')}
                            {m.wasAutoRouted && (
                              <span className="text-[8.5px] tracking-wide font-medium bg-indigo-950/40 border border-indigo-900/40 text-indigo-400 px-1 py-0.5 rounded uppercase leading-none">
                                Smart Routed
                              </span>
                            )}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {isStreaming && idx === activeSession.messages.length - 1 && (
                              <span className="inline-flex items-center gap-1 text-indigo-400 animate-pulse text-[9px] font-medium font-mono">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                <span>Generating {streamDuration}s</span>
                              </span>
                            )}
                            
                            {!isStreaming && idx === activeSession.messages.length - 1 && lastResponseTime && (
                              <span className="text-[9px] text-neutral-500 font-mono">
                                Took {lastResponseTime}s
                              </span>
                            )}

                            <CopyMessageButton content={m.content} />
                          </div>
                        </div>
                      )}

                      {/* Content parsing block */}
                      <MessageRenderer content={m.content} />

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
            onStop={handleStopGenerating}
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
              className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0d10] shadow-2xl relative z-10 font-sans p-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4.5 h-4.5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">Keyboard Workspace Shortcuts</h3>
                </div>
                <button
                  onClick={() => setIsShortcutsOpen(false)}
                  className="rounded-lg p-1 hover:bg-white/[0.03] text-neutral-400 hover:text-white cursor-pointer select-none transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 select-none text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Aura Command Palette Launcher</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Ctrl</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Shift</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">P</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">High Performance Focus Mode</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">F10</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Toggle Workspace Sidebar</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">F9</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Open Prompts Library Blueprints</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Ctrl</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">B</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">New Thread Workspace</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Ctrl</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">K</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Export Current Thread (JSON)</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Ctrl</kbd>
                    <span className="text-neutral-500 font-semibold">+</span>
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">E</kbd>
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

                <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 mt-3.5">
                  <span className="text-neutral-400 font-medium">Auto-scroll Active Feed</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 rounded bg-[#111112] border border-neutral-850 font-mono text-[10px] text-white">Esc</kbd>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center select-none pt-2 border-t border-white/[0.04]">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Press escape to dismiss modal</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Legal Modals */}
      <LegalModal
        isOpen={legalModalOpen}
        type={legalModalType}
        onClose={() => setLegalModalOpen(false)}
      />

      {/* Premium Features Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandActions}
      />

      <PromptLibrary
        isOpen={isPromptLibraryOpen}
        onClose={() => setIsPromptLibraryOpen(false)}
        prompts={customPrompts}
        onSavePrompt={(p) => setCustomPrompts(prev => [p, ...prev])}
        onDeletePrompt={(id) => setCustomPrompts(prev => prev.filter(p => p.id !== id))}
        onUsePrompt={(promptText) => {
          setIsPromptLibraryOpen(false);
          handleSendMessage(promptText);
        }}
      />

    </div>
  );

  // Helper handle prompt card selects
  function handleSelectSuggestedPrompt(promptText: string) {
    handleSendMessage(promptText);
  }
}
