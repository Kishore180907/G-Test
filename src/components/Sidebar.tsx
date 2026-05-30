import { Plus, Trash, Trash2, MessageSquare, ShieldCheck, Key, HelpCircle, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { ChatSession, ServerConfigStatus } from '../types';

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
  return (
    <aside 
      className="w-full md:w-[280px] bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 text-slate-100 h-full"
      id="chat-sidebar"
    >
      {/* Brand Launcher Block */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between select-none bg-slate-950/60 font-sans">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider text-white">K15h07E - Open Chat</h1>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest font-black uppercase">v1.0.0 Stable</span>
          </div>
        </div>
      </div>

      {/* Primary Action */}
      <div className="p-4 shrink-0">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-all duration-150 shadow-md shadow-emerald-950/50 hover:translate-y-[-1px] select-none cursor-pointer"
          id="new-chat-btn"
        >
          <Plus className="w-4 h-4" />
          <span>New Thread</span>
        </button>
      </div>

      {/* Historical List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-900 select-none">
        <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Chat History
        </div>

        {sessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs px-4">
            <LayoutGrid className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-50" />
            No chat threads found. Start by writing a prompt!
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className="group flex items-center justify-between rounded-xl transition-all relative"
                id={`session-item-${session.id}`}
              >
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={`flex-1 text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3 overflow-hidden cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 text-white font-medium border border-slate-800' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div className="truncate text-xs leading-normal">
                    <span className="block truncate font-medium text-slate-100">{session.title}</span>
                    <span className="block text-[9px] text-slate-500 font-mono truncate mt-0.5 uppercase tracking-wide">
                      {session.modelId.split('/').pop()}
                    </span>
                  </div>
                </button>
                
                {/* Delete button toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 hover:bg-slate-800 hover:text-rose-400 p-1.5 rounded-lg transition-all duration-150 text-slate-500 select-none cursor-pointer"
                  title="Delete chat session"
                  id={`delete-btn-${session.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Clear History Panel */}
      {sessions.length > 0 && (
        <div className="p-4 border-t border-slate-900 bg-slate-950/80 font-sans shrink-0">
          <button
            onClick={onClearAll}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-rose-950/40 hover:bg-rose-950/15 hover:text-rose-400 text-slate-400 transition-all text-[11px] font-semibold cursor-pointer select-none"
            id="clear-all-chats-btn"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>Clear Conversations</span>
          </button>
        </div>
      )}
    </aside>
  );
}
