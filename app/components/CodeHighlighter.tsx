'use client';

import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface CodeHighlighterProps {
  code: string;
  language: string;
}

export default function CodeHighlighter({ code, language }: CodeHighlighterProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Only show the UI after mount to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <pre>{code}</pre>; // Simple fallback for server render
  }
  
  const isDarkMode = resolvedTheme === 'dark';

  return (
    <SyntaxHighlighter
      language={language}
      style={isDarkMode ? oneDark : oneLight}
      customStyle={{ background: 'transparent', padding: 0, margin: 0 }}
      wrapLines={true}
      lineProps={{ style: { background: 'transparent' } }}
      codeTagProps={{ style: { background: 'transparent' } }}
    >
      {code}
    </SyntaxHighlighter>
  );
} 