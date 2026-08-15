'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Sun, Moon, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { detectLanguage, loadLanguageGrammar } from '@/lib/code-language';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SyntaxHighlighterComponent = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismStyle = Record<string, any>;

interface CodePreviewProps {
  url: string;
  filename: string | null;
}

export function CodePreview({ url, filename }: CodePreviewProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(false);
    api
      .get(url, { responseType: 'text' })
      .then((res) => {
        if (!cancelled) setText(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error || text === null) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {error ? 'Failed to load preview' : 'Loading preview...'}
      </div>
    );
  }

  return <CodeViewer text={text} filename={filename} />;
}

function CodeViewer({ text, filename }: { text: string; filename: string | null }) {
  const language = useMemo(() => detectLanguage(filename), [filename]);
  const [Highlighter, setHighlighter] = useState<SyntaxHighlighterComponent | null>(null);
  const [style, setStyle] = useState<PrismStyle | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ default: SyntaxHighlighter }, grammar] = await Promise.all([
        import('react-syntax-highlighter/dist/esm/prism-light'),
        language !== 'text' ? loadLanguageGrammar(language) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (grammar) {
        SyntaxHighlighter.registerLanguage(language, grammar);
      }
      setHighlighter(() => SyntaxHighlighter);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    const loadStyle =
      theme === 'dark'
        ? import('react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus')
        : import('react-syntax-highlighter/dist/esm/styles/prism/one-light');
    loadStyle.then((mod) => {
      if (!cancelled) setStyle(mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [theme]);

  const lines = useMemo(() => text.split('\n'), [text]);
  const matchingLines = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const matches: number[] = [];
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(needle)) matches.push(i + 1);
    });
    return matches;
  }, [lines, query]);

  useEffect(() => {
    setMatchIndex(0);
  }, [query]);

  useEffect(() => {
    if (matchingLines.length === 0) return;
    const line = matchingLines[matchIndex % matchingLines.length];
    document.getElementById(`code-line-${line}`)?.scrollIntoView({ block: 'center' });
  }, [matchIndex, matchingLines]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const currentMatchLabel =
    matchingLines.length > 0 ? `${(matchIndex % matchingLines.length) + 1}/${matchingLines.length}` : '0/0';

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search in file..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-48 text-sm"
          />
          {query.trim() && (
            <>
              <span className="min-w-12 text-xs text-muted-foreground">{currentMatchLabel}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={matchingLines.length === 0}
                onClick={() =>
                  setMatchIndex((i) => (i - 1 + matchingLines.length) % matchingLines.length)
                }
                aria-label="Previous match"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={matchingLines.length === 0}
                onClick={() => setMatchIndex((i) => (i + 1) % matchingLines.length)}
                aria-label="Next match"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto rounded-md border">
        {Highlighter && style ? (
          <Highlighter
            language={language !== 'text' ? language : undefined}
            style={style}
            showLineNumbers
            wrapLines
            lineProps={(lineNumber: number) => ({
              id: `code-line-${lineNumber}`,
              style: matchingLines.includes(lineNumber)
                ? { display: 'block', backgroundColor: 'rgba(250, 204, 21, 0.25)' }
                : { display: 'block' },
            })}
            customStyle={{ margin: 0, fontSize: '0.8125rem' }}
          >
            {text}
          </Highlighter>
        ) : (
          <pre className="bg-muted p-4 text-sm font-mono whitespace-pre-wrap">{text}</pre>
        )}
      </div>
    </div>
  );
}
