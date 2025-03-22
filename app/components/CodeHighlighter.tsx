'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface CodeHighlighterProps {
  code: string;
  language: string;
}

export default function CodeHighlighter({ code, language }: CodeHighlighterProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  return (
    <SyntaxHighlighter
      language={language}
      style={isDarkMode ? oneDark : oneLight}
      customStyle={{ background: 'transparent', padding: 0, margin: 0 }}
    >
      {code}
    </SyntaxHighlighter>
  );
} 