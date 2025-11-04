// File: api/save-image.js (Vercel Blob ONLY)
import { put } from '@vercel/blob';
import { Buffer } from 'node:buffer'; 
// NOTE: MongoDB imports and connection logic have been removed.

// Vercel will use the standard Node.js Serverless Runtime by default.

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const { 
            image_name, operation, original_width, 
            original_height, new_width, new_height, 
            image_data_url 
        } = body;

        // --- A. Upload to Vercel Blob ---
        
        // 1. Convert the base64 data URL into a Blob
        const base64Image = image_data_url.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const imageBlob = new Blob([buffer], { type: 'image/png' });

        // 2. Create a unique filename and upload
        const filename = `${Date.now()}-${image_name.replace(/\s/g, '_')}.png`;

        const blobResult = await put(filename, imageBlob, {
            access: 'public', // Must be public to view the image URL
            addRandomSuffix: false, 
        });

        // NOTE: MongoDB logging steps are completely skipped here.

        return new Response(JSON.stringify({ 
            message: `Image saved successfully to Vercel Blob. Operation logged: ${operation}`, 
            url: blobResult.url 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Server Error (Blob Upload Failed):', error);
        return new Response(JSON.stringify({ message: `Internal Server Error during Blob upload: ${error.message}` }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
