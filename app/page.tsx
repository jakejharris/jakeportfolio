import './css/page.css'
import './css/animations.css'
import PageLayout from './components/PageLayout';
import Link from 'next/link';

export default function HomePage() {
  const posts = [
    { id: 1, title: "Project Alpha", date: "Jan 2023", viewCount: 200, link: "/page/project-alpha" },
    { id: 2, title: "Blog Post Beta", date: "Mar 2023", viewCount: 150, link: "/page/blog-post-beta" },
    { id: 3, title: "Project Gamma", date: "Feb 2023", viewCount: 300, link: "/page/project-gamma" },
  ];

  return (
    <PageLayout>
      <div className="max-w-none">
        <h2 className="mb-4 text-xl md:text-2xl font-bold">Blog & Projects</h2>
        <ul className="space-y-2">
          {posts.map((post) => (
            <li key={post.id} className="relative">
              <Link 
                href={post.link} 
                className="pageLinkContainer flex justify-between items-center border p-3 cursor-pointer group"
                aria-label={`View ${post.title}`}
              >
                <div>
                  <div className="text-primary font-medium">{post.title}</div>
                  <div className="text-sm text-muted-foreground">{post.date}</div>
                </div>
                <div className="text-sm text-muted-foreground">{post.viewCount} views</div>
              </Link>
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
