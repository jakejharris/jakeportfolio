import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/app/lib/sanity.client';

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Find the post by slug
    const post = await client.fetch(
      `*[_type == "post" && slug.current == $slug][0]`,
      { slug }
    );

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment the view count using the writeClient
    const updatedPost = await writeClient
      .patch(post._id)
      .inc({ viewCount: 1 })
      .commit();

    return NextResponse.json({
      viewCount: updatedPost.viewCount,
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
} 