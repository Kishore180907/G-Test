import { useState } from 'react';
import { Copy, Check, Terminal, FileCode, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface MessageRendererProps {
  content: string;
}

export function MessageRenderer({ content }: MessageRendererProps) {
  const parts = parseMarkdown(content);

  return (
    <div className="space-y-4 font-sans text-sm md:text-md leading-relaxed text-neutral-200 select-text font-normal">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return (
            <div key={idx}>
              <CodeBlock 
                language={part.language || 'code'} 
                code={part.text} 
              />
            </div>
          );
        } else if (part.type === 'header') {
          const level = part.level || 1;
          const classes = level === 1 ? 'text-lg font-bold pt-3 pb-1 text-white border-b border-neutral-850/60 font-sans tracking-tight' :
                          level === 2 ? 'text-md font-semibold pt-2 text-white font-sans' :
                          'text-xs font-bold pt-1.5 uppercase tracking-wider text-neutral-300 font-sans';
          return <h3 key={idx} className={classes}>{part.text}</h3>;
        } else if (part.type === 'list-item') {
          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start pl-1.5 space-x-2.5 pt-0.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500/80 shrink-0 mt-2.5 select-none" />
              <span className="flex-1 text-neutral-300">
                {renderInlineFormatting(part.text)}
              </span>
            </motion.div>
          );
        } else {
          // Standard text with inline formats
          return (
            <p key={idx} className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {renderInlineFormatting(part.text)}
            </p>
          );
        }
      })}
    </div>
  );
}

// Subcomponents with polished styling
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const isTerminal = ['bash', 'sh', 'shell', 'zsh', 'terminal'].includes(language.toLowerCase());

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-neutral-850 bg-[#070708] font-mono text-xs md:text-[13px] shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-850 text-neutral-400 font-sans select-none text-[11px] font-medium font-sans">
        <div className="flex items-center gap-2">
          {isTerminal ? (
            <Terminal className="w-3.5 h-3.5 text-neutral-500" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-purple-400/80" />
          )}
          <span className="lowercase font-semibold text-neutral-300 tracking-wide">{language || 'code'}</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-all duration-150 py-1 px-2 rounded-lg hover:bg-neutral-800 cursor-pointer select-none border border-transparent hover:border-neutral-700/40 text-[10.5px]"
          title="Copy code snippet"
          type="button"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-neutral-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[#eceef0] whitespace-pre scrollbar-thin scrollbar-thumb-neutral-850 bg-[#070708]">
        <code className="font-mono block select-all">{code}</code>
      </div>
    </div>
  );
}

// Helpers
interface ParsedBlock {
  type: 'text' | 'code' | 'header' | 'list-item';
  text: string;
  language?: string;
  level?: number;
}

function parseMarkdown(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = text.split('\n');
  let currentCodeText: string[] = [];
  let inCode = false;
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code block
    if (line.trim().startsWith('```')) {
      if (inCode) {
        // Close code block
        blocks.push({
          type: 'code',
          text: currentCodeText.join('\n'),
          language: codeLanguage || 'text'
        });
        currentCodeText = [];
        inCode = false;
      } else {
        // Open code block
        inCode = true;
        codeLanguage = line.trim().substring(3).trim();
      }
      continue;
    }

    if (inCode) {
      currentCodeText.push(line);
      continue;
    }

    // Unordered List parsing
    const listMatch = line.match(/^(\s*)[-*+•]\s+(.*)/);
    if (listMatch) {
      blocks.push({
        type: 'list-item',
        text: listMatch[2]
      });
      continue;
    }

    // Ordered List parsing
    const orderedListMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (orderedListMatch) {
      blocks.push({
        type: 'list-item',
        text: orderedListMatch[2]
      });
      continue;
    }

    // Header parsing
    if (line.startsWith('#')) {
      const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headerMatch) {
        blocks.push({
          type: 'header',
          text: headerMatch[2],
          level: headerMatch[1].length
        });
        continue;
      }
    }

    // Regular line
    blocks.push({
      type: 'text',
      text: line
    });
  }

  // If stream closes midcode, render open code block cleanly
  if (inCode && currentCodeText.length > 0) {
    blocks.push({
      type: 'code',
      text: currentCodeText.join('\n'),
      language: codeLanguage || 'text'
    });
  }

  return blocks.filter((b, idx) => {
    if (b.type === 'text' && b.text.trim() === '') {
      if (idx === blocks.length - 1 || idx === 0) return false;
    }
    return true;
  });
}

function renderInlineFormatting(text: string) {
  // Regex to match inline `code`, **bold**, *italic*
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(pattern);

  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={idx} 
          className="mx-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-850 text-[12px] font-mono text-purple-355 text-purple-300 font-semibold select-all"
        >
          {part.substring(1, part.length - 1)}
        </code>
      );
    } else if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-extrabold text-white">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-neutral-200">
          {part.substring(1, part.length - 1)}
        </em>
      );
    }
    return part;
  });
}
