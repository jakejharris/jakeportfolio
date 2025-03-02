import PageLayout from '@/app/components/PageLayout';
import Image from 'next/image';
import { sanityFetch, urlFor } from '@/app/lib/sanity.client';
import { PortableText } from '@portabletext/react';
import { notFound } from 'next/navigation';
import { FaGithub, FaGlobe, FaLinkedin, FaTwitter, FaYoutube, FaCodepen, FaExternalLinkAlt } from 'react-icons/fa';
import ViewCounter from './ViewCounter';
import { Post } from '@/app/types/sanity';
import { Button } from '@/app/components/ui/button';

// Query to fetch a single post by slug
const query = `*[_type == "post" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  publishedAt,
  mainImage,
  content,
  excerpt,
  viewCount,
  externalLinks,
  "tags": tags[]->{ _id, title, slug }
}`;

// Components for rendering the portable text content
const components = {
  types: {
    image: ({ value }: { value: ImageValue }) => {
      return (
        <div className={`my-8 ${value.fullWidth ? 'w-full' : 'max-w-2xl mx-auto'}`}>
          <Image
            src={urlFor(value).width(800).url()}
            alt={value.alt || ''}
            width={800}
            height={value.fullWidth ? 400 : 500}
            className="rounded-sm"
          />
          {value.caption && (
            <p className="text-sm text-center text-muted-foreground mt-2">{value.caption}</p>
          )}
        </div>
      );
    },
    youtube: ({ value }: { value: YoutubeValue }) => {
      // Extract video ID from YouTube URL
      const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
      };
      
      const videoId = getYouTubeId(value.url);
      
      if (!videoId) return <div>Invalid YouTube URL</div>;
      
      return (
        <div className="my-8">
          <div className="relative pb-[56.25%] h-0 overflow-hidden max-w-full">
            <iframe 
              src={`https://www.youtube.com/embed/${videoId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-sm"
            />
          </div>
          {value.caption && (
            <p className="text-sm text-center text-muted-foreground mt-2">{value.caption}</p>
          )}
        </div>
      );
    },
    codeSnippet: ({ value }: { value: CodeSnippetValue }) => {
      return (
        <div className="my-8">
          {value.filename && (
            <div className="bg-muted px-4 py-2 text-sm rounded-t-lg border-b border-border">
              {value.filename}
            </div>
          )}
          <pre className={`p-4 rounded-sm ${value.filename ? 'rounded-t-none' : ''} bg-muted overflow-x-auto`}>
            <code className={`language-${value.language || 'javascript'}`}>
              {value.code}
            </code>
          </pre>
        </div>
      );
    },
    imageCarousel: ({ value }: { value: ImageCarouselValue }) => {
      return (
        <div className="my-8">
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
            {value.images.map((image: ImageValue, index: number) => (
              <div key={index} className="snap-center flex-shrink-0 w-full md:w-2/3">
                <Image
                  src={urlFor(image).width(800).url()}
                  alt={image.alt || ''}
                  width={800}
                  height={500}
                  className="rounded-sm"
                />
                {image.caption && (
                  <p className="text-sm text-center text-muted-foreground mt-2">{image.caption}</p>
                )}
              </div>
            ))}
          </div>
          {value.caption && (
            <p className="text-sm text-center text-muted-foreground mt-2">{value.caption}</p>
          )}
        </div>
      );
    },
    callToAction: ({ value }: { value: CallToActionValue }) => {
      const styles = {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground'
      };
      
      return (
        <div className="my-8 flex justify-center">
          <a 
            href={value.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`px-4 py-2 rounded-md font-medium ${styles[value.style as keyof typeof styles]}`}
          >
            {value.text}
          </a>
        </div>
      );
    },
    quoteBlock: ({ value }: { value: QuoteBlockValue }) => {
      return (
        <blockquote className="my-8 border-l-4 border-primary pl-4 italic">
          <p className="text-lg">{value.quote}</p>
          {value.attribution && (
            <footer className="text-sm text-muted-foreground mt-2">— {value.attribution}</footer>
          )}
        </blockquote>
      );
    },
    divider: ({ value }: { value: DividerValue }) => {
      const styles = {
        line: 'border-t',
        dots: 'flex justify-center space-x-2',
        dashed: 'border-t border-dashed'
      };
      
      if (value.style === 'dots') {
        return (
          <div className="my-8 flex justify-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
            <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
            <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
          </div>
        );
      }
      
      return (
        <hr className={`my-8 ${styles[value.style as keyof typeof styles]}`} />
      );
    }
  }
};

// Map icon strings to React components
const iconMap: Record<string, React.ComponentType> = {
  FaGithub,
  FaGlobe,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaCodepen,
  FaExternalLinkAlt
};

// Define params type for Next.js page
type PageParams = {
  params: Promise<{
    slug: string;
  }>;
};

// Define component value types
interface ImageValue {
  _type: 'image';
  alt?: string;
  caption?: string;
  fullWidth?: boolean;
  asset: {
    _ref: string;
    _type: 'reference';
  };
  [key: string]: unknown; // Add index signature to match SanityImageSource
}

interface YoutubeValue {
  _type: 'youtube';
  url: string;
  caption?: string;
}

interface CodeSnippetValue {
  _type: 'codeSnippet';
  language?: string;
  filename?: string;
  code: string;
}

interface ImageCarouselValue {
  _type: 'imageCarousel';
  images: ImageValue[];
  caption?: string;
}

interface CallToActionValue {
  _type: 'callToAction';
  text: string;
  url: string;
  style: 'primary' | 'secondary' | 'ghost';
}

interface QuoteBlockValue {
  _type: 'quoteBlock';
  quote: string;
  attribution?: string;
}

interface DividerValue {
  _type: 'divider';
  style: 'line' | 'dots' | 'dashed';
}

export default async function PostPage({ params }: PageParams) {
  // Get the slug from params - await it properly
  const { slug } = await params;
  
  // Fetch the post data from Sanity
  const post = await sanityFetch<Post>({
    query,
    params: { slug },
    tags: [`post:${slug}`],
  });

  // If post not found, return 404
  if (!post) {
    notFound();
  }

  return (
    <PageLayout>
      <div className="max-w-none">
        {/* <Link 
          href="/" 
          className="group animated-underline !flex w-fit items-center gap-0 mb-6"
          aria-label="Return to home page"
        >
 
          <span className="font-medium">&larr; Back to Home</span>
        </Link> */}
        
        {post.mainImage && (
          <div className="mb-6 relative h-[300px] md:h-[400px] rounded-sm overflow-hidden">
            <Image
              src={urlFor(post.mainImage).width(1200).height(600).url()}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {post.title}
        </h1>
        
        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <ViewCounter slug={slug} initialCount={post.viewCount} />
          
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-2">
              {post.tags.map(tag => (
                <span 
                  key={tag._id} 
                  className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag.title}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {post.excerpt && (
          <div className="mb-8 text-lg font-medium text-muted-foreground">
            {post.excerpt}
          </div>
        )}
        
        <div className="prose dark:prose-invert max-w-none">
          {post.content && (
            <PortableText value={post.content} components={components} />
          )}
        </div>
        
        {post.externalLinks && post.externalLinks.length > 0 && (
          <div className="mt-12 pt-6 border-t">
            <h2 className="text-xl font-bold mb-4">External Links</h2>
            <div className="flex flex-wrap gap-4">
              {post.externalLinks.map((link, index) => {
                const Icon = iconMap[link.icon] || FaExternalLinkAlt;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Icon />
                      <span>{link.title}</span>
                    </a>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
} 