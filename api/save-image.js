// File: api/save-image.js
import { put } from '@vercel/blob';
import { MongoClient } from 'mongodb'; 
import { Buffer } from 'node:buffer'; // Import Buffer for Data URL conversion

// 1. Initialize MongoDB Client
// URI is securely fetched from Vercel's MONGODB_URI Environment Variable.
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000, 
    maxPoolSize: 1, // Max connections for serverless best practice
});
let cachedDb = null; // Cache the database connection

// Configure for the fast Vercel Edge Runtime
export const config = {
  runtime: 'edge', 
};

/**
 * Connects to MongoDB, reusing the connection if available.
 */
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    // Connect to the MongoDB cluster
    await client.connect();
    // Use your desired database name:
    const database = client.db("ImageProcessorDB"); 
    cachedDb = database;
    return database;
}

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
        // 1. Convert the base64 data URL into a Blob
        // Data URL format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...
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