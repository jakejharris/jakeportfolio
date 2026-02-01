import './css/page.css'
import './css/animations.css'
import PageLayout from './components/PageLayout';
import TransitionLink from './components/TransitionLink';
import { sanityFetch } from './lib/sanity.client';
import { PostSummary } from './types/sanity';
import { Eye } from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent
} from './components/hover-card';
import ScrollToTop from './components/ScrollToTop';
import PixelFluidBackground from './components/PixelFluidBackground';
import { TagBadge } from './components/blog/TagBadge';
import HeroSection from './components/HeroSection';

// Query to fetch posts from Sanity
const query = `*[_type == "post"] | order(featured desc, publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  viewCount,
  featured,
  excerpt,
  "tags": tags[]->{ _id, title, slug }
}`;

export default async function HomePage() {
  // Fetch posts from Sanity
  const posts = await sanityFetch<PostSummary[]>({
    query,
    tags: ['post'],
  });

  return (
    <>
      <PixelFluidBackground />
      <PageLayout>
        <ScrollToTop />
      <HeroSection />
      <div className="max-w-none">
        <h2 className="text-xl font-semibold mb-4">Recent Writing</h2>
        <ul className="space-y-2 mb-8">
          {posts.map((post) => (
            <li key={post._id} className="relative">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <TransitionLink
                    href={`/posts/${post.slug.current}#`}
                    className={`pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group ${post.featured ? 'pinnedLinkBorder' : ''}`}
                    aria-label={`View ${post.title}`}
                    scroll={true}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-primary text-sm md:text-base font-medium mb-1 leading-tight flex items-center gap-1">
                          {post.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">
                            {new Date(post.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                            })}
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex gap-1">
                              {post.tags.map(tag => (
                                <TagBadge key={tag._id} tag={tag} size="sm" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ms-4 text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      {post.viewCount} <Eye className="h-4 w-4" />
                    </div>
                  </TransitionLink>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 hidden md:block">
                  <div className="space-y-2">
                    {post.featured && (
                      <div className="flex h-2 items-center text-black bg-accent rounded-[1px] mb-3">
                        {/* <PinIcon className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Pinned Post</span> */}
                      </div>
                    )}
                    {/* <h4 className="text-sm font-semibold">{post.title}</h4> */}
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground">
                        {post.excerpt}
                      </p>
                    )}
                    <TransitionLink href={`/posts/${post.slug.current}#`} scroll={true} className="animated-underline-small-muted pt-2 text-xs text-muted-foreground">
                      Click to read full post
                    </TransitionLink>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </li>
          ))}
          {/* <li className="relative w-full !mt-4">
            <div className="text-sm text-muted-foreground w-full text-center">
              <span>More Posts Coming Soon</span>
            </div>
          </li> */}
        </ul>
      </div>
      </PageLayout>
    </>
  );
}

/*
Note on the view counter:
To make the view counter actually work, we could build a backend API route in Next.js that:
  1. Receives a request when a blog post is viewed.
  2. Increments the view count stored in a database (e.g., MongoDB, PostgreSQL, or even a serverless solution like Firebase).
  3. Returns the updated view count which can be fetched either at page load (using getServerSideProps) or on the client-side (using useEffect).
This approach ensures that each view is recorded accurately and the counter updates accordingly.
*/
