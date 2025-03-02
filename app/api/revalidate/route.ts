import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const body = await req.json();
    
    // Extract the secret token from the request headers
    const secret = req.headers.get('x-webhook-secret');
    
    // Verify the secret token
    if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }
    
    // Log the received payload for debugging
    console.log('Received webhook payload:', body);
    
    // Extract information from Sanity webhook payload
    // Sanity sends information in the following structure:
    // { ids: { created: [], updated: [], deleted: [] }, operation: 'create|update|delete' }
    const documentType = body?.documentType || 'post'; // Default to 'post' if not specified
    
    // Revalidate the tag based on document type
    revalidateTag(documentType);
    
    // Also revalidate the generic 'post' tag as it's used in our queries
    revalidateTag('post');
    
    // Log the revalidation
    console.log(`Revalidated content with tag: ${documentType} and 'post'`);
    
    // Return success response
    return NextResponse.json({ 
      revalidated: true, 
      message: `Revalidated content with tag: ${documentType} and 'post'` 
    });
  } catch (error) {
    // Log and return error
    console.error('Error revalidating:', error);
    return NextResponse.json({ message: 'Error revalidating', error: String(error) }, { status: 500 });
  }
} 