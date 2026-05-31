import { useState } from 'react';
import { Copy, Check, Terminal, FileCode } from 'lucide-react';
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
          const classes = level === 1 ? 'text-lg font-display font-bold pt-3 pb-1 text-white border-b border-white/[0.04] tracking-tight' :
                          level === 2 ? 'text-base font-display font-semibold pt-2 text-white' :
                          'text-xs font-bold pt-1.5 uppercase tracking-wider text-neutral-400 font-sans';
          return <h3 key={idx} className={classes}>{part.text}</h3>;
        } else if (part.type === 'list-item') {
          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start pl-1.5 space-x-2.5 pt-0.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2.5 select-none" />
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

// Subcomponents with polished styling and light-weight regex syntax highlighting
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

  // High-performance token coloring helper
  const highlightCodeTokenized = (rawCode: string, langName: string) => {
    const l = langName.toLowerCase();
    
    if (['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript', 'json', 'python', 'py', 'html', 'css', 'bash', 'shell', 'sh'].includes(l)) {
      // Escape HTML characters to prevent XSS and malformed structures
      let html = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Comments: line-comments & blocks
      if (l === 'python' || l === 'py') {
        html = html.replace(/(#.*?)$/gm, '<span class="text-neutral-500 italic font-normal">$1</span>');
      } else if (l === 'bash' || l === 'shell' || l === 'sh') {
        html = html.replace(/(#.*?)$/gm, '<span class="text-neutral-500 italic font-normal">$1</span>');
      } else {
        html = html.replace(/(\/\/.*?)$/gm, '<span class="text-neutral-500 italic font-normal">$1</span>');
        html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-neutral-500 italic font-normal">$1</span>');
      }

      // Strings: double, single & template quotes
      html = html.replace(/(["'`])(.*?)\1/g, '<span class="text-amber-300">$1$2$1</span>');

      // Constants and built-in type keywords
      const builtins = ['const', 'let', 'var', 'true', 'false', 'null', 'undefined'];
      const builtinsRegex = new RegExp(`\\b(${builtins.join('|')})\\b`, 'g');
      html = html.replace(builtinsRegex, '<span class="text-purple-400 font-medium">$1</span>');

      // Core programming statements & controls (blue/indigo)
      const keywordGroup = [
        'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'export', 'from',
        'default', 'try', 'catch', 'finally', 'async', 'await', 'function', 'interface', 'type', 'extends'
      ];
      const keywordsRegex = new RegExp(`\\b(${keywordGroup.join('|')})\\b`, 'g');
      html = html.replace(keywordsRegex, '<span class="text-indigo-400">$1</span>');

      // Command-line tools keywords for shell scripts
      if (l === 'bash' || l === 'shell' || l === 'sh') {
        const shellCmds = ['npm', 'npx', 'node', 'cd', 'mkdir', 'git', 'curl', 'wget', 'sudo', 'grep', 'cat', 'echo', 'ls', 'install', 'run', 'build'];
        const shellRegex = new RegExp(`\\b(${shellCmds.join('|')})\\b`, 'g');
        html = html.replace(shellRegex, '<span class="text-emerald-400 font-semibold">$1</span>');
      }

      // Numeric values
      html = html.replace(/\b(\d+)\b/g, '<span class="text-pink-400">$1</span>');

      return (
        <code 
          className="font-mono block select-all whitespace-pre" 
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      );
    }

    // Default raw code fallback
    return <code className="font-mono block select-all whitespace-pre">{rawCode}</code>;
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/[0.06] bg-[#08080a] font-mono text-xs md:text-[13px] shadow-xl">
      {/* Top Header tab bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.04] text-neutral-400 font-sans select-none text-[11px] font-medium">
        <div className="flex items-center gap-2">
          {isTerminal ? (
            <Terminal className="w-3.5 h-3.5 text-neutral-500" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span className="lowercase font-semibold text-neutral-300 tracking-wide">{language || 'code'}</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-all duration-150 py-1 px-2 rounded-lg hover:bg-white/[0.04] cursor-pointer select-none border border-transparent hover:border-white/[0.04] text-[10.5px]"
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

      {/* Code viewport area */}
      <div className="p-4 overflow-x-auto text-[#eceef0] whitespace-pre scrollbar-thin scrollbar-thumb-white/[0.04] bg-[#08080a]">
        {highlightCodeTokenized(code, language)}
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
          className="mx-1 px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.04] text-[12px] font-mono text-indigo-300 font-semibold select-all"
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
