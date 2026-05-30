import { useState, useMemo } from 'react';
import { Plus, Trash2, MessageSquare, Search, Keyboard, Calendar, History, Inbox, Linkedin, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { ChatSession, ServerConfigStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  status: ServerConfigStatus;
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAll,
  status
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  // Grouping sessions helper
  const groupedSessions = useMemo(() => {
    // Filter sessions by search query first
    const filtered = sessions.filter(session => {
      const q = searchQuery.toLowerCase();
      return (
        session.title.toLowerCase().includes(q) ||
        session.modelId.toLowerCase().includes(q)
      );
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    const sections = {
      today: [] as ChatSession[],
      yesterday: [] as ChatSession[],
      previous7Days: [] as ChatSession[],
      older: [] as ChatSession[]
    };

    filtered.forEach(session => {
      const time = session.updatedAt || session.createdAt || Date.now();
      if (time >= todayStart) {
        sections.today.push(session);
      } else if (time >= yesterdayStart) {
        sections.yesterday.push(session);
      } else if (time >= sevenDaysAgoStart) {
        sections.previous7Days.push(session);
      } else {
        sections.older.push(session);
      }
    });

    return sections;
  }, [sessions, searchQuery]);

  const hasAnySessions = sessions.length > 0;
  const hasFilteredResults = 
    groupedSessions.today.length > 0 ||
    groupedSessions.yesterday.length > 0 ||
    groupedSessions.previous7Days.length > 0 ||
    groupedSessions.older.length > 0;

  // Simple LinkedIn tooltip state
  const [showTooltip, setShowTooltip] = useState(false);

  // Function to render a session list item
  const renderSessionItem = (session: ChatSession) => {
    const isActive = session.id === activeSessionId;
    return (
      <motion.div
        key={session.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="group relative mb-1.5"
        onMouseEnter={() => setHoveredSessionId(session.id)}
        onMouseLeave={() => setHoveredSessionId(null)}
        id={`session-item-${session.id}`}
      >
        <button
          onClick={() => onSelectSession(session.id)}
          className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 overflow-hidden cursor-pointer relative ${
            isActive 
              ? 'bg-neutral-800 text-white font-medium border border-neutral-700 shadow-md shadow-black/30' 
              : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60'
          }`}
        >
          <div className="absolute inset-y-0 left-0 w-1 rounded-r-md bg-gradient-to-b from-purple-500 to-blue-500 opacity-0 transition-opacity duration-200 group-hover:opacity-30 active:opacity-100" />
          
          <MessageSquare className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isActive ? 'text-purple-400 scale-105' : 'text-neutral-500 group-hover:text-neutral-300'
          }`} />
          
          <div className="truncate flex-1 min-w-0 pr-6">
            <span className="block truncate text-xs font-medium text-neutral-200 leading-normal">{session.title}</span>
            <span className="block text-[10px] text-neutral-500 font-mono truncate mt-0.5 uppercase tracking-wider">
              {session.modelId.split('/').pop()}
            </span>
          </div>
        </button>
        
        {/* Hover / Active Actions */}
        <AnimatePresence>
          {(hoveredSessionId === session.id || isActive) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-neutral-950/80 backdrop-blur-md hover:bg-red-950/40 hover:text-red-400 p-1.5 rounded-lg border border-neutral-800/80 text-neutral-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer select-none"
              title="Delete chat session"
              id={`delete-btn-${session.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <aside 
      className="w-full md:w-[290px] bg-neutral-950 border-r border-neutral-900 flex flex-col shrink-0 text-neutral-200 h-full font-sans"
      id="chat-sidebar"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-900 flex items-center justify-between select-none bg-neutral-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-950/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold tracking-tight text-white leading-none">Aura Workspace</h1>
              <span className="text-[9px] font-extrabold bg-neutral-850 text-purple-400 border border-neutral-800 px-1 py-0.5 rounded leading-none">PRO</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-widest font-medium uppercase mt-0.5 block">AI Proxy Client</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4 pb-2 shrink-0">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-xs hover:from-purple-500 hover:to-blue-500 transition-all duration-250 shadow-lg shadow-purple-950/30 hover:shadow-purple-950/45 hover:scale-[1.01] active:scale-[0.99] select-none cursor-pointer border border-purple-500/30"
          id="new-chat-btn"
        >
          <Plus className="w-4 h-4 text-white/90" />
          <span>New Workspace Thread</span>
        </button>
      </div>

      {/* Search Input for filtering sessions */}
      <div className="px-4 py-2 shrink-0 select-none">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-900 bg-neutral-900/40 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/40 transition-all"
            id="sidebar-search-input"
          />
        </div>
      </div>

      {/* Historical Grouped List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-4 scrollbar-thin scrollbar-thumb-neutral-900 select-none">
        {!hasAnySessions ? (
          <div className="py-20 text-center text-neutral-500 text-xs px-4 space-y-3">
            <div className="w-10 h-10 rounded-full bg-neutral-900/60 flex items-center justify-center mx-auto text-neutral-400">
              <Inbox className="w-4.5 h-4.5" />
            </div>
            <p className="font-medium">No conversation threads</p>
            <p className="text-[11px] text-neutral-600 leading-relaxed max-w-[180px] mx-auto">
              Start by selecting a model and writing your prompt!
            </p>
          </div>
        ) : !hasFilteredResults ? (
          <div className="py-12 text-center text-neutral-500 text-xs px-4 space-y-2">
            <AlertCircle className="w-5 h-5 text-neutral-600 mx-auto" />
            <p className="font-semibold text-neutral-400">No matching threads</p>
            <p className="text-[10px] text-neutral-600 leading-relaxed">
              Try adjusting your query.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* TODAY SECTION */}
            {groupedSessions.today.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 select-none">
                  <Calendar className="w-3 h-3 text-purple-400/80" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-505 text-neutral-400">Today</span>
                </div>
                <div>{groupedSessions.today.map(renderSessionItem)}</div>
              </div>
            )}

            {/* YESTERDAY SECTION */}
            {groupedSessions.yesterday.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 select-none">
                  <History className="w-3 h-3 text-neutral-505" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-505 text-neutral-400">Yesterday</span>
                </div>
                <div>{groupedSessions.yesterday.map(renderSessionItem)}</div>
              </div>
            )}

            {/* PREVIOUS 7 DAYS SECTION */}
            {groupedSessions.previous7Days.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 select-none">
                  <Calendar className="w-3 h-3 text-neutral-505" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Previous 7 Days</span>
                </div>
                <div>{groupedSessions.previous7Days.map(renderSessionItem)}</div>
              </div>
            )}

            {/* OLDER SECTION */}
            {groupedSessions.older.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 select-none">
                  <Calendar className="w-3 h-3 text-neutral-505" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Older Stories</span>
                </div>
                <div>{groupedSessions.older.map(renderSessionItem)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear conversations and user/profile panel */}
      <div className="border-t border-neutral-900 bg-neutral-950/60 p-3 flex flex-col gap-2 shrink-0 select-none">
        {hasAnySessions && (
          <button
            onClick={onClearAll}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-950/15 group transition-all text-xs border border-transparent hover:border-red-950/30 cursor-pointer select-none"
            id="clear-all-chats-btn"
          >
            <Trash2 className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
            <span className="font-semibold">Clear Threads</span>
          </button>
        )}

        {/* Creator profile card */}
        <div className="relative mt-1">
          <a
            href="https://www.linkedin.com/in/kishore1kishore/"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-850 hover:border-neutral-800 transition-all duration-200 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-900/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-900/40 transition-colors">
              <Linkedin className="w-4 h-4 text-indigo-400 group-hover:scale-105 transition-transform" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] font-semibold text-white truncate">Kishore Saravana</span>
                <ExternalLink className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 group-hover:text-neutral-300 transition-all shrink-0" />
              </div>
              <span className="block text-[9.5px] text-neutral-550 text-neutral-400 font-medium tracking-wide mt-0.5">LinkedIn Profile</span>
            </div>
          </a>

          {/* Tooltip Popup */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: -4, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 px-3 py-2 bg-neutral-900 text-white border border-neutral-800 rounded-lg text-[10px] font-medium shadow-2xl tracking-wide w-[180px] text-center pointer-events-none z-50 flex flex-col gap-0.5 justify-center"
              >
                <span className="font-semibold text-purple-400">CONNECT ON LINKEDIN</span>
                <span className="text-[9.5px] text-neutral-450 text-neutral-400 leading-normal">Open in a secure new tab</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 border-r border-b border-neutral-800 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
