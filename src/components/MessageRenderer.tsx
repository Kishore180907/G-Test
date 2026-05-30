import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MessageRendererProps {
  content: string;
}

export function MessageRenderer({ content }: MessageRendererProps) {
  // Simple custom fast markdown block parser that is highly robust for streaming text
  const parts = parseMarkdown(content);

  return (
    <div className="space-y-3 font-sans text-sm md:text-base leading-relaxed text-slate-100 select-text">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return (
            <CodeBlock 
              key={idx} 
              language={part.language || 'code'} 
              code={part.text} 
            />
          );
        } else if (part.type === 'header') {
          const level = part.level || 1;
          const classes = level === 1 ? 'text-xl font-bold pt-2 text-white border-b border-slate-800 pb-1' :
                          level === 2 ? 'text-lg font-bold pt-2 text-white' :
                          'text-base font-semibold pt-1 text-slate-200';
          return <p key={idx} className={classes}>{part.text}</p>;
        } else if (part.type === 'list-item') {
          return (
            <div key={idx} className="flex items-start pl-3 space-x-2 pt-0.5">
              <span className="text-emerald-500 font-bold select-none">•</span>
              <span className="flex-1 text-slate-200">
                {renderInlineFormatting(part.text)}
              </span>
            </div>
          );
        } else {
          // Standard text with inline formats
          return (
            <p key={idx} className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {renderInlineFormatting(part.text)}
            </p>
          );
        }
      })}
    </div>
  );
}

// Subcomponents
function CodeBlock({ language, code }: { language: string; code: string; key?: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs md:text-sm shadow-lg">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400 font-sans select-none text-xs">
        <span className="font-mono text-emerald-400 font-medium">{language.toLowerCase()}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors duration-150 px-1.5 py-0.5 rounded hover:bg-slate-800"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-emerald-50/90 whitespace-pre scrollbar-thin scrollbar-thumb-slate-800">
        <code>{code}</code>
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

    // Regular line - let's group adjacent non-empty plain lines to keep paragraphs clean or keep separate if spaced
    blocks.push({
      type: 'text',
      text: line
    });
  }

  // If stream closes midcode, ensure we render the open code blocks
  if (inCode && currentCodeText.length > 0) {
    blocks.push({
      type: 'code',
      text: currentCodeText.join('\n'),
      language: codeLanguage || 'text'
    });
  }

  // Clean empty lines at start/end unless consecutive
  return blocks.filter((b, idx) => {
    if (b.type === 'text' && b.text.trim() === '') {
      // Allow single blank space occasionally but filter trailing noise
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
          className="mx-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 select-all"
        >
          {part.substring(1, part.length - 1)}
        </code>
      );
    } else if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-white">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-slate-100">
          {part.substring(1, part.length - 1)}
        </em>
      );
    }
    return part;
  });
}
