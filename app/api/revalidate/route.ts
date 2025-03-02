import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const body = await req.json();
    
    // Extract the secret token from the request headers
    const secret = req.headers.get('x-webhook-secret');
    
    // Verify the secret token
    if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
      console.log('Invalid webhook secret provided');
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }
    
    // Log the received payload for debugging
    console.log('Received webhook payload:', JSON.stringify(body, null, 2));
    
    // Extract the document type if available in the payload
    // Sanity webhooks typically include _type in the body
    const documentType = body?._type || 'post';
    
    console.log(`Document type from webhook: ${documentType}`);
    
    // Revalidate by document type
    revalidateTag(documentType);
    
    // Always revalidate the 'post' tag as it's used in the main query
    revalidateTag('post');
    
    // Additionally revalidate the home page path
    revalidatePath('/', 'page');
    
    // Log the revalidation
    console.log(`Revalidated content with tag: ${documentType} and 'post', also revalidated homepage path`);
    
    // Return success response
    return NextResponse.json({ 
      revalidated: true, 
      message: `Revalidated content successfully` 
    });
  } catch (error) {
    // Log and return error
    console.error('Error revalidating:', error);
    return NextResponse.json({ message: 'Error revalidating', error: String(error) }, { status: 500 });
  }
} 