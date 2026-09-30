import '../css/page.css'
import '../css/animations.css'
import PageLayout from '../components/PageLayout';
import TransitionLink from '../components/TransitionLink';
import { sanityFetch } from '../lib/sanity.client';
import { getLivePostViewCounts } from '../lib/live-post-views';
import { PostSummary } from '../types/sanity';
import { Eye } from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent
} from '../components/hover-card';
import TagPill from '../components/TagPill';
import { SHOW_POST_TAGS } from '../lib/tag-display';
import Hero from '../components/Hero';
import GlassLight from '../components/GlassLight';
import PinnedBadge from '../components/PinnedBadge';

// Published pages refresh in the background; the webhook also expires content.
export const revalidate = 60;

// Query to fetch posts from Sanity
const query = `*[_type == "post"] | order(featured desc, publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  viewCount,
  viewCountBase,
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
  const liveViewCounts = await getLivePostViewCounts(
    posts.map((post) => post.slug.current),
    { revalidate: 60 }
  );

  return (
    <>
      <PageLayout>
      <Hero />
      <div className="max-w-none">
        <div className="section-kicker" data-fluid-island>Writing &amp; work</div>
        <GlassLight />
        <ul className="space-y-2">
          {posts.map((post) => {
            const displayedViewCount =
              liveViewCounts === null ? null : liveViewCounts[post.slug.current] ??
              post.viewCountBase ??
              post.viewCount ??
              0;

            return (
            <li key={post._id} className="relative">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <TransitionLink
                    href={`/posts/${post.slug.current}/`}
                    className="pageLinkContainer flex justify-between items-center cursor-pointer group"
                    aria-label={`View ${post.featured ? "pinned post: " : ""}${post.title}`}
                    scroll={true}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-primary text-sm md:text-base font-medium mb-1 leading-tight flex items-center gap-1">
                          {post.featured ? (
                            <span className="pinned-title-anchor">
                              {post.title}
                              <PinnedBadge />
                            </span>
                          ) : post.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">
                            {new Date(post.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                            })}
                          </div>
                          {SHOW_POST_TAGS && post.tags && post.tags.length > 0 && (
                            <div className="hidden md:flex gap-1">
                              {post.tags.map(tag => (
                                <TagPill linked={false} tag={tag} key={tag.slug.current} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {displayedViewCount !== null && <div className="ms-4 text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      {displayedViewCount} <Eye className="h-4 w-4" />
                    </div>}
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
                    <TransitionLink href={`/posts/${post.slug.current}/`} scroll={true} className="animated-underline-small-muted pt-2 text-xs text-muted-foreground">
                      Click to read full post
                    </TransitionLink>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </li>
            );
          })}
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
