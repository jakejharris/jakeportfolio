import './css/page.css'
import './css/animations.css'
import PageLayout from './components/PageLayout';
import Link from 'next/link';
import { sanityFetch } from './lib/sanity.client';
import { PostSummary } from './types/sanity';
import { Eye } from "lucide-react";
import { 
  HoverCard, 
  HoverCardTrigger, 
  HoverCardContent 
} from './components/hover-card';
import { PinIcon } from "lucide-react";

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
    <PageLayout>
      <div className="max-w-none">
        {/* <h2 className="mb-4 text-xl md:text-2xl font-bold">Recent Posts</h2> */}
        <ul className="space-y-2 mb-8">
          {posts.map((post) => (
            <li key={post._id} className="relative">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Link 
                    href={`/posts/${post.slug.current}`} 
                    className={`pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group ${post.featured ? 'pinnedLinkBorder' : ''}`}
                    aria-label={`View ${post.title}`}
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
                              day: 'numeric',
                            })}
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex gap-1">
                              {post.tags.map(tag => (
                                <span 
                                  key={tag._id} 
                                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                >
                                  {tag.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ms-2 text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      {post.viewCount} <Eye className="h-4 w-4" />
                    </div>
                  </Link>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    {post.featured && (
                      <div className="flex h-2 items-center text-black bg-accent rounded-[1px] mb-3">
                        {/* <PinIcon className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Pinned Post</span> */}
                      </div>
                    )}
                    <h4 className="text-sm font-semibold">{post.title}</h4>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground">
                        {post.excerpt}
                      </p>
                    )}
                    <Link href={`/posts/${post.slug.current}`} className="animated-underline-small-muted pt-2 text-xs text-muted-foreground">
                      Click to read full post
                    </Link>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </li>
          ))}
        </ul>
      </div>
    </PageLayout>
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
