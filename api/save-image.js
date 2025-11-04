// File: api/save-image.js
import { put } from "@vercel/blob";

const { url } = await put('articles/blob.txt', 'Hello World!', { access: 'public' });
import { MongoClient } from 'mongodb'; 
import { Buffer } from 'node:buffer'; // Used for Data URL conversion (supported in Node.js Runtime)

// 1. Initialize MongoDB Client & Connection Caching
// The URI is securely fetched from Vercel's MONGODB_URI Environment Variable.
const uri = process.env.MONGODB_URI;

// We initialize the client outside the handler to reuse the connection across invocations.
const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000, 
    maxPoolSize: 1, // Keep pool small for serverless best practice
});

let cachedPromise = null; // Cache the promise that connects to the database

/**
 * Connects to MongoDB, reusing the connection if available.
 * This is the recommended pattern for Node.js Serverless Functions.
 */
function connectToDatabase() {
  if (cachedPromise) {
    return cachedPromise;
  }
  
  // Connect and store the promise (for the "ImageProcessorDB" database)
  cachedPromise = client.connect().then(() => client.db("ImageProcessorDB"));
  return cachedPromise;
}

// 🛑 REMOVED: export const config = { runtime: 'edge', };
// Vercel will now use the standard Node.js Serverless Runtime, resolving the dependency errors.

export default async function handler(req) {
    // Only allow POST requests from the client-side script
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
        // 1. Convert the base64 data URL into a Blob using Node's Buffer
        const base64Image = image_data_url.split(';base64,').pop();
        const buffer = Buffer.from(base64Image, 'base64');
        const imageBlob = new Blob([buffer], { type: 'image/png' });

        // 2. Create a unique filename and upload
        const filename = `${Date.now()}-${image_name.replace(/\s/g, '_')}.png`;

        const blobResult = await put(filename, imageBlob, {
            access: 'public', // Must be public to view the image URL
            addRandomSuffix: false, 
        });

        // --- B. Log to MongoDB ---
        const db = await connectToDatabase();
        // Use your desired collection name:
        const operationsCollection = db.collection("image_operations"); 

        const operationDocument = {
            image_name: image_name,
            operation_type: operation,
            blob_url: blobResult.url, // Save the public Vercel Blob URL
            original_width: original_width,
            original_height: original_height,
            new_width: new_width,
            new_height: new_height,
            timestamp: new Date(),
        };

        await operationsCollection.insertOne(operationDocument);
        
        return new Response(JSON.stringify({ 
            message: 'Image and log saved successfully via MongoDB', 
            url: blobResult.url 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Server Error:', error);
        return new Response(JSON.stringify({ message: `Internal Server Error: ${error.message}` }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
