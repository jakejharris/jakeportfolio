'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/app/components/ui/badge';
import { MouseEvent } from 'react';

interface TagBadgeProps {
  tag: {
    title: string;
    slug: { current: string };
    color?: string;
  };
  size?: 'sm' | 'md';
  interactive?: boolean;
}

export function TagBadge({ tag, size = 'sm', interactive = true }: TagBadgeProps) {
  const router = useRouter();

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  const baseClasses = `${sizeClasses} rounded-full bg-muted text-muted-foreground`;

  // Apply custom color if provided
  const colorStyle = tag.color
    ? { backgroundColor: `${tag.color}20`, borderColor: tag.color }
    : undefined;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (interactive) {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/blog/tags/${tag.slug.current}`);
    }
  };

  if (interactive) {
    return (
      <Badge
        variant="outline"
        className={`${baseClasses} hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer`}
        style={colorStyle}
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push(`/blog/tags/${tag.slug.current}`);
          }
        }}
      >
        {tag.title}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={baseClasses}
      style={colorStyle}
    >
      {tag.title}
    </Badge>
  );
}

export default TagBadge;
