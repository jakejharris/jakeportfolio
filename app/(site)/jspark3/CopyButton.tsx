'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

/**
 * Copies one verbatim block to the clipboard. The icon turns to a check for two
 * seconds and a polite live region says so; the button keeps its size, so
 * nothing around it moves.
 */
export default function CopyButton({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  const [status, setStatus] = React.useState('');
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    let next = 'Copied';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = 'Copy failed';
    }
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), 2000);
  };

  const copied = status === 'Copied';
  const Icon = copied ? Check : Copy;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={`h-8 w-8 shrink-0 bg-card text-muted-foreground hover:text-foreground ${className}`}
      >
        <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${copied ? 'text-[color:var(--accent-color)]' : ''}`} />
      </Button>
      <span role="status" className="sr-only">
        {status}
      </span>
    </>
  );
}
