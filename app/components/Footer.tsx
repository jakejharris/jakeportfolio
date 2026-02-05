import { FaGithub } from 'react-icons/fa';
import { Button } from './ui/button';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer role="contentinfo" aria-label="Site footer" className="w-full bg-secondary text-foreground">
      <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
        <div className="text-sm">
          © Jake Harris {currentYear}
        </div>
        <div className="text-sm flex items-center">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href="/blog">
              Blog
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex items-center gap-1"
          >
            <a
              href="https://github.com/jakejharris/jakeportfolio"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source <FaGithub className="ps-1 w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </footer>
  );
} 