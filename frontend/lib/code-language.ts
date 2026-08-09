// Extension → Prism language id. Only languages listed here get a lazily
// loaded grammar in loadLanguageGrammar(); anything else falls back to
// plain text rendering rather than failing.
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  py: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  sql: 'sql',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  css: 'css',
  kt: 'kotlin',
  swift: 'swift',
  scala: 'scala',
  r: 'r',
  pl: 'perl',
  lua: 'lua',
};

export function detectLanguage(filename?: string | null): string {
  if (!filename) return 'text';
  const base = filename.toLowerCase();
  if (base === 'dockerfile') return 'docker';
  const ext = base.split('.').pop();
  if (!ext || ext === base) return 'text';
  return EXTENSION_TO_LANGUAGE[ext] ?? 'text';
}

// Each entry is loaded on demand so a viewer only pays for the one grammar
// they're actually looking at, the same reasoning as pdf-preview.tsx's
// dynamic pdfjs-dist import.
const LANGUAGE_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  python: () => import('react-syntax-highlighter/dist/esm/languages/prism/python'),
  javascript: () => import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
  jsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/jsx'),
  typescript: () => import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
  tsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
  java: () => import('react-syntax-highlighter/dist/esm/languages/prism/java'),
  c: () => import('react-syntax-highlighter/dist/esm/languages/prism/c'),
  cpp: () => import('react-syntax-highlighter/dist/esm/languages/prism/cpp'),
  csharp: () => import('react-syntax-highlighter/dist/esm/languages/prism/csharp'),
  go: () => import('react-syntax-highlighter/dist/esm/languages/prism/go'),
  rust: () => import('react-syntax-highlighter/dist/esm/languages/prism/rust'),
  ruby: () => import('react-syntax-highlighter/dist/esm/languages/prism/ruby'),
  php: () => import('react-syntax-highlighter/dist/esm/languages/prism/php'),
  sql: () => import('react-syntax-highlighter/dist/esm/languages/prism/sql'),
  json: () => import('react-syntax-highlighter/dist/esm/languages/prism/json'),
  yaml: () => import('react-syntax-highlighter/dist/esm/languages/prism/yaml'),
  markdown: () => import('react-syntax-highlighter/dist/esm/languages/prism/markdown'),
  bash: () => import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
  markup: () => import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
  css: () => import('react-syntax-highlighter/dist/esm/languages/prism/css'),
  kotlin: () => import('react-syntax-highlighter/dist/esm/languages/prism/kotlin'),
  swift: () => import('react-syntax-highlighter/dist/esm/languages/prism/swift'),
  scala: () => import('react-syntax-highlighter/dist/esm/languages/prism/scala'),
  r: () => import('react-syntax-highlighter/dist/esm/languages/prism/r'),
  perl: () => import('react-syntax-highlighter/dist/esm/languages/prism/perl'),
  lua: () => import('react-syntax-highlighter/dist/esm/languages/prism/lua'),
  docker: () => import('react-syntax-highlighter/dist/esm/languages/prism/docker'),
};

export async function loadLanguageGrammar(language: string): Promise<unknown | null> {
  const loader = LANGUAGE_LOADERS[language];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}
