import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/app/lib/sanity.client';

// Fetch all posts (title, slug, _id, viewCount)
export async function GET() {
  try {
    const posts = await client.fetch(
      `*[_type == \"post\"]{ _id, title, slug, viewCount } | order(title asc)`
    );
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// Update view count for a specific post
export async function POST(request: NextRequest) {
  try {
    const { postId, changeAmount } = await request.json();

    if (!postId || typeof changeAmount !== 'number') {
      return NextResponse.json(
        { error: 'postId and changeAmount (number) are required' },
        { status: 400 }
      );
    }

    // Fetch the current view count first to prevent going negative
    const post = await client.fetch(
      `*[_type == \"post\" && _id == $postId][0]{ viewCount }`,
      { postId }
    );

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const currentViews = post.viewCount || 0;
    const newViewCount = currentViews + changeAmount;

    if (newViewCount < 0) {
      return NextResponse.json(
        { error: 'View count cannot be negative' },
        { status: 400 }
      );
    }

    // Increment/decrement the view count using the writeClient
    const updatedPost = await writeClient
      .patch(postId)
      .set({ viewCount: newViewCount }) // Use set for precise control
      .commit();

    return NextResponse.json({
      viewCount: updatedPost.viewCount,
    });
  } catch (error: any) {
    console.error('Error updating view count:', error);
    // Provide more specific Sanity error if available
    const errorMessage = error.responseBody || 'Failed to update view count';
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 