// One-off prompts to send people, newest last. Each one is a section of
// /prompts/, anchored by its slug so /prompts/#<slug> links straight to it.
// The text is copied exactly as written here, line breaks and indentation
// included. Paragraphs are separated by one blank line.

export type Prompt = {
  slug: string;
  title: string;
  description?: string;
  text: string;
};

export const PROMPTS: Prompt[] = [
  {
    slug: 'claude-code-context-status-line',
    title: 'Claude Code context status line',
    description: 'A status line that shows how much of the context window a session has used.',
    text: `Set up a status line for me that shows context window usage for this session.

1. Check the Claude Code docs for the current statusLine JSON schema passed on stdin.
2. Write ~/.claude/statusline.sh (use jq, install it if missing) that prints one line:
   model · 10-segment bar · % used · used/limit tokens (e.g. 84k/200k)
   - Prefer the context_window fields from stdin; if absent, sum input + cache_read + cache_creation tokens from the last assistant message's usage in transcript_path.
   - Bar color thresholds depend on the window size:
     - Under 400k: green <50%, yellow 50-80%, red >80%
     - 400k or more (e.g. 1M): green up to 25%, yellow above 25%, red above 40%
   - Show "compact soon" whenever the bar is red.
3. chmod +x it and add "statusLine": {"type": "command", "command": "~/.claude/statusline.sh"} to ~/.claude/settings.json without clobbering existing settings.
4. Test it with sample JSON for both a 200k and a 1M window and show me the output.`,
  },
];
