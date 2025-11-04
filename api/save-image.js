// File: api/save-image.js (Vercel Blob ONLY - Corrected for Node.js Runtime)
import { put } from '@vercel/blob';
import { Buffer } from 'node:buffer'; 

// Utility function to parse the raw body stream into a JSON object
async function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error("Failed to parse JSON body"));
            }
        });
        req.on('error', reject);
    });
}

export default async function handler(req) {
    if (req.method !== 'POST') {
        // Return a Web API Response object, which Vercel handles
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { 
            status: 405, 
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 🛑 CRITICAL FIX: Use the utility function to parse the body stream
        const body = await parseJsonBody(req);
        
        const { 
            image_name, operation, original_width, 
            original_height, new_width, new_height, 
            image_data_url 
        } = body;

        // --- A. Upload to Vercel Blob ---
        const base64Image = image_data_url.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const imageBlob = new Blob([buffer], { type: 'image/png' });

        const filename = `${Date.now()}-${image_name.replace(/\s/g, '_')}.png`;

        const blobResult = await put(filename, imageBlob, {
            access: 'public', 
            addRandomSuffix: false, 
        });

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
