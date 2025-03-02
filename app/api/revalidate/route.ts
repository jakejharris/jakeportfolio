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
    
    // Get the updated document type from the body
    const documentType = body?.type;
    
    if (!documentType) {
      return NextResponse.json({ message: 'No document type provided' }, { status: 400 });
    }
    
    // Revalidate the appropriate tag based on document type
    revalidateTag(documentType);
    
    // Log the revalidation
    console.log(`Revalidated content with tag: ${documentType}`);
    
    // Return success response
    return NextResponse.json({ 
      revalidated: true, 
      message: `Revalidated content with tag: ${documentType}` 
    });
  } catch (error) {
    // Log and return error
    console.error('Error revalidating:', error);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
} 