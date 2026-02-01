import TransitionLink from "./TransitionLink";

export default function PostCTA() {
  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="pageLinkContainer p-6">
        <h3 className="text-lg font-semibold mb-2">Enjoyed this post?</h3>
        <p className="text-muted-foreground mb-4">
          Let&apos;s connect! I&apos;m always open to discussing new projects and opportunities.
        </p>
        <div className="flex gap-3">
          <TransitionLink
            href="/contact"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Get in Touch
          </TransitionLink>
          <TransitionLink
            href="/about"
            className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors text-sm"
          >
            Learn More About Me
          </TransitionLink>
        </div>
      </div>
    </div>
  );
}
