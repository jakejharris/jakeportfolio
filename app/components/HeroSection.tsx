import TransitionLink from "./TransitionLink";

export default function HeroSection() {
  return (
    <section className="mb-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">
        Jake Harris
      </h1>
      <p className="text-lg text-muted-foreground mb-6">
        Full Stack Developer building AI-powered web applications and digital experiences.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <TransitionLink
          href="/about"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          About Me
        </TransitionLink>
        <TransitionLink
          href="/contact"
          className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          Get in Touch
        </TransitionLink>
      </div>
    </section>
  );
}
