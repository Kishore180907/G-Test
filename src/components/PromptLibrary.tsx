import React, { useState } from 'react';
import { X, BookOpen, Plus, Hash, Trash, Check, Sparkles } from 'lucide-react';
import { PromptTemplate } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptTemplate[];
  onSavePrompt: (p: PromptTemplate) => void;
  onDeletePrompt: (id: string) => void;
  onUsePrompt: (promptText: string) => void;
}

// Built-in beautifully written templates
const STARTER_TEMPLATES: PromptTemplate[] = [
  {
    id: 'starter-code-review',
    title: 'Code Review & Audit',
    category: 'Development',
    prompt: 'Examine this code carefully to highlight potential vulnerabilities, security risks, memory leaks, and logic flaws. Suggest highly optimized, production-grade refactored code matching TypeScript best practices:',
    createdAt: 0
  },
  {
    id: 'starter-eli5',
    title: 'Explain Like I\'m 5',
    category: 'Explode Concept',
    prompt: 'Explain the following highly technical concept in extremely simple, analogies-rich language that a 5-year old could understand. Use humble words and avoid jargon:',
    createdAt: 0
  },
  {
    id: 'starter-writer',
    title: 'Blog Post Outline Creator',
    category: 'Content Writing',
    prompt: 'Create a comprehensive, engaging, SEO-optimized blog post outline and structural breakdown for the topic below. Include visual suggestions (illustrations, diagram scopes) and a catchy display-level title suggestion:',
    createdAt: 0
  },
  {
    id: 'starter-debug',
    title: 'Debug Helper',
    category: 'Troubleshoot',
    prompt: 'I am getting an unexpected stack trace error in my system. Analyze this error snippet, explain the most probable root cause (e.g., race conditions, unhandled rejections, undefined values), and show exactly how to correct it step-by-step:',
    createdAt: 0
  },
  {
    id: 'starter-data-analyst',
    title: 'Data Insight Analyst',
    category: 'Data Logic',
    prompt: 'Examine this dataset structure and propose 5 critical descriptive business trends or diagnostic questions we should test inside this data. Include sample SQL query structures or elegant Python Pandas script suggestions:',
    createdAt: 0
  },
  {
    id: 'starter-refactor',
    title: 'Advanced Clean Refactoring',
    category: 'Refactoring',
    prompt: 'Take the following function, strip clutter, eliminate nested conditions with guard clauses, extract descriptive helpers, apply proper TS type declarations, and explain how the update enhances performance:',
    createdAt: 0
  }
];

export function PromptLibrary({
  isOpen,
  onClose,
  prompts,
  onSavePrompt,
  onDeletePrompt,
  onUsePrompt
}: PromptLibraryProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'builtin' | 'custom'>('all');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPromptText.trim()) return;

    const customPrompt: PromptTemplate = {
      id: `prompt-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory.trim() || 'General',
      prompt: newPromptText.trim(),
      createdAt: Date.now()
    };

    onSavePrompt(customPrompt);
    setNewTitle('');
    setNewCategory('');
    setNewPromptText('');
    setIsCreating(false);
  };

  // Combine both built-in templates and user saved prompts
  const allPrompts = [...STARTER_TEMPLATES, ...prompts];

  const filteredPrompts = allPrompts.filter((p) => {
    if (activeTab === 'builtin') return p.createdAt === 0;
    if (activeTab === 'custom') return p.createdAt > 0;
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0d0f] shadow-2xl relative z-10 font-sans flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-4.5 select-none shrink-0 bg-[#07070a]/60">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight font-display">
                    Prompt Templates Library
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Save and reuse your most successful AI blueprints</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreating(!isCreating)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer select-none transition-colors border border-indigo-500/20"
                  type="button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Template</span>
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 hover:bg-white/[0.03] text-neutral-400 hover:text-white cursor-pointer select-none transition-colors border border-transparent hover:border-white/[0.04]"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick-Filter Navigation Tabs */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-white/[0.04] bg-neutral-950/20 text-xs select-none shrink-0">
              <div className="flex gap-2">
                {(['all', 'builtin', 'custom'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs leading-none cursor-pointer capitalize font-semibold transition-all ${
                      activeTab === tab
                        ? 'bg-white/[0.04] text-white'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {tab === 'builtin' ? 'System Starter' : tab === 'custom' ? 'My Presets' : 'All Blueprints'}
                  </button>
                ))}
              </div>
              <span className="text-[10.5px] font-mono font-medium text-neutral-600">
                {filteredPrompts.length} templates
              </span>
            </div>

            {/* Scrollable Content Viewport */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {/* Collapsible Creative Create Editor Block */}
              <AnimatePresence>
                {isCreating && (
                  <motion.form
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    onSubmit={handleSave}
                    className="overflow-hidden border border-white/[0.06] bg-white/[0.02] rounded-xl p-4.5 space-y-3 shrink-0"
                  >
                    <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.04] select-none">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Save New Prompt Preset</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-neutral-400 select-none uppercase tracking-wide">Template Display Name</label>
                        <input
                          type="text"
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g. Code Optimizer Block"
                          className="w-full text-xs bg-neutral-950 border border-white/[0.04] focus:border-indigo-500 rounded-lg px-3 py-2 text-neutral-200 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-neutral-400 select-none uppercase tracking-wide">Category/Tag</label>
                        <input
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="e.g. Architecture, Utilities"
                          className="w-full text-xs bg-neutral-950 border border-white/[0.04] focus:border-indigo-500 rounded-lg px-3 py-2 text-neutral-200 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-neutral-400 select-none uppercase tracking-wide">Prompt System Pattern</label>
                      <textarea
                        required
                        rows={3}
                        value={newPromptText}
                        onChange={(e) => setNewPromptText(e.target.value)}
                        placeholder="Type the full prompt instruction here. When uses, this prompt gets pasted into the terminal ready to go..."
                        className="w-full resize-none text-xs bg-neutral-950 border border-white/[0.04] focus:border-indigo-500 rounded-lg p-3 text-neutral-200 outline-none min-h-[90px] leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 select-none">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/[0.03] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-neutral-150 transition-colors cursor-pointer"
                      >
                        Add Template
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Grid Layout of Prompts */}
              {filteredPrompts.length === 0 ? (
                <div className="py-20 text-center text-xs text-neutral-500 select-none font-medium">
                  No prompt blueprints matching the chosen filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPrompts.map((p) => {
                    const isBuiltin = p.createdAt === 0;
                    return (
                      <div
                        key={p.id}
                        className="flex flex-col justify-between p-4.5 rounded-xl border border-white/[0.04] hover:border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.02] transition-all group"
                      >
                        <div className="space-y-2">
                          {/* Top Row meta */}
                          <div className="flex items-center justify-between select-none">
                            <span className="text-[9px] font-bold uppercase py-0.5 px-2 tracking-widest rounded bg-white/[0.04] text-neutral-400">
                              {p.category}
                            </span>
                            {!isBuiltin && (
                              <button
                                onClick={() => onDeletePrompt(p.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-all cursor-pointer select-none"
                                title="Delete preset"
                                type="button"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
                            <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{p.title}</span>
                          </h4>

                          <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-3 select-text">
                            {p.prompt}
                          </p>
                        </div>

                        <div className="flex items-center justify-end pt-3 select-none">
                          <button
                            onClick={() => onUsePrompt(p.prompt)}
                            className="w-full py-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] text-[10.5px] font-bold text-indigo-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all cursor-pointer"
                            type="button"
                          >
                            Activate Blueprint
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
