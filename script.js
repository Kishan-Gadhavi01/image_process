/* === 1. GET ALL THE ELEMENTS === */
// Canvases
const originalCanvas = document.getElementById('original-canvas');
const processedCanvas = document.getElementById('processed-canvas');
const originalCtx = originalCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');

// File Input
const fileUpload = document.getElementById('file-upload');

// Buttons
const scaleButtons = [
    document.getElementById('upscale-btn-1_25'),
    document.getElementById('upscale-btn-1_5'),
    document.getElementById('downscale-btn-0_75'),
    document.getElementById('downscale-btn-0_5'),
];
const filterSelect = document.getElementById('filter-select');
const applyFilterBtn = document.getElementById('apply-filter-btn');
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');

// Store the original uploaded image
let originalImage = null;


// --- NEW SAVE AND LOG FUNCTION (Added for Vercel Blob/MongoDB) ---

/**
 * Triggers the Vercel API Route to save the image to Vercel Blob 
 * and log the operation metadata to MongoDB.
 * @param {string} operationType - e.g., 'scale: 1.25x', 'filter:sepia', 'download'
 */
async function saveProcessedImageAndLog(operationType) {
    if (!originalImage) return;

    const file = fileUpload.files?.[0]; // Get the actual File object
    if (!file) return;

    // 1. Prepare payload with canvas data and metadata
    const imageBlobDataURL = processedCanvas.toDataURL('image/png');

    const savePayload = {
        image_name: file.name || 'unknown',
        operation: operationType,
        original_width: originalCanvas.width,
        original_height: originalCanvas.height,
        new_width: processedCanvas.width,
        new_height: processedCanvas.height,
        image_data_url: imageBlobDataURL, 
    };

    console.log(`[Sending to /api/save-image]: ${operationType}`);

    try {
        // Fetch the Vercel API Route!
        const response = await fetch('/api/save-image', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(savePayload), 
        });

        if (response.ok) {
            console.log('Successfully saved to Vercel Blob and MongoDB.');
        } else {
            const error = await response.json();
            console.error('API Error:', error.message);
        }

    } catch (error) {
        console.error('Error connecting to Vercel API:', error);
    }
}


/* === 2. EVENT LISTENERS === */

// --- 2.1. File Upload ---
fileUpload.addEventListener('change', handleImageUpload);

// --- 2.2. Scaling Buttons ---
scaleButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        // Get the scale factor from the button ID (e.g., "upscale-btn-1_25" -> 1.25)
        const factor = parseFloat(e.target.id.split('_').pop());
        scaleImage(factor);
    });
});

// --- 2.3. Filter Button ---
applyFilterBtn.addEventListener('click', applyFilter);

// --- 2.4. Reset Button ---
resetBtn.addEventListener('click', resetImage);

// --- 2.5. Download Button ---
downloadBtn.addEventListener('click', downloadImage);


/* === 3. CORE FUNCTIONS === */

/**
 * Loads the user's file, draws it to both canvases, and enables controls.
 */
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Store the original image
            originalImage = img;

            // Draw to "Original" canvas
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            originalCtx.drawImage(img, 0, 0);

            // Draw to "Processed" canvas
            processedCanvas.width = img.width;
            processedCanvas.height = img.height;
            processedCtx.drawImage(img, 0, 0);

            // Enable all buttons
            enableControls(true);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Scales the image on the "Processed" canvas.
 * This operation scales from the CURRENT processed image.
 */
function scaleImage(factor) {
    if (!originalImage) return;

    // Get current processed image data to scale it
    const currentWidth = processedCanvas.width;
    const currentHeight = processedCanvas.height;
    
    const newWidth = Math.round(currentWidth * factor);
    const newHeight = Math.round(currentHeight * factor);

    // Get the image data from the canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentWidth;
    tempCanvas.height = currentHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(processedCanvas, 0, 0);

    // Set new dimensions and draw the scaled image
    processedCanvas.width = newWidth;
    processedCanvas.height = newHeight;
    
    // Turn off image smoothing for a sharper "pixelated" look on upscaling
    processedCtx.imageSmoothingEnabled = false; 
    processedCtx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

    // --- ADDED LOGGING ---
    saveProcessedImageAndLog(`scale: ${factor}x`);
}

/**
 * Resets the "Processed" canvas back to the original uploaded image.
 */
function resetImage() {
    if (!originalImage) return;
    processedCanvas.width = originalImage.width;
    processedCanvas.height = originalImage.height;
    processedCtx.drawImage(originalImage, 0, 0);
    
    // Reset filter dropdown
    filterSelect.value = "none";

    // --- ADDED LOGGING ---
    saveProcessedImageAndLog('reset');
}

/**
 * Downloads the "Processed" canvas as a PNG file.
 */
function downloadImage() {
    const dataURL = processedCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'processed-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // --- ADDED LOGGING ---
    saveProcessedImageAndLog('download');
}

/**
 * Toggles the disabled state of all control buttons.
 */
function enableControls(enabled) {
    scaleButtons.forEach(button => button.disabled = !enabled);
    applyFilterBtn.disabled = !enabled;
    resetBtn.disabled = !enabled;
    downloadBtn.disabled = !enabled;
}

/**
 * Applies the selected filter to the "Processed" canvas.
 */
function applyFilter() {
    const filter = filterSelect.value;
    if (filter === 'none') return;

    const width = processedCanvas.width;
    const height = processedCanvas.height;
    
    // --- A. Simple CSS Filters (Fast & Easy) ---
    const easyFilters = {
        'grayscale': 'grayscale(100%)',
        'sepia': 'sepia(100%)',
        'invert': 'invert(100%)',
        'brightness': 'brightness(1.1)',
        'blur': 'blur(2px)', 
    };

    if (easyFilters[filter]) {
        // Draw current canvas to a temp canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(processedCanvas, 0, 0);

        // Apply filter to main canvas and draw the temp image back
        processedCtx.filter = easyFilters[filter];
        processedCtx.drawImage(tempCanvas, 0, 0);
        processedCtx.filter = 'none'; // Reset filter

        // --- ADDED LOGGING ---
        saveProcessedImageAndLog(`filter: ${filter}`);
        return;
    }

    // --- B. Manual "Computer Vision" Filters (Pixel by Pixel) ---
    const imageData = processedCtx.getImageData(0, 0, width, height);
    
    if (filter === 'emboss' || filter === 'sharpen') {
        applyConvolution(filter, imageData);
        
        // --- ADDED LOGGING ---
        saveProcessedImageAndLog(`filter: ${filter}`);
    }
}

/**
 * Applies a convolution kernel (matrix) to the image data.
 */
function applyConvolution(type, imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Create a copy of the data to read from, so we don't
    const dataCopy = new Uint8ClampedArray(data);

    let kernel;
    if (type === 'sharpen') {
        kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];
    } else if (type === 'emboss') {
        kernel = [
            [-2, -1, 0],
            [-1, 1, 1],
            [0, 1, 2]
        ];
    }
    
    const kernelSize = kernel.length;
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            // Don't process edge pixels for simplicity
            if (y < halfKernel || y >= height - halfKernel || x < halfKernel || x >= width - halfKernel) {
                continue;
            }

            let r = 0, g = 0, b = 0;

            // Apply the kernel
            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const px = x + kx - halfKernel; // Pixel x
                    const py = y + ky - halfKernel; // Pixel y
                    
                    const i = (py * width + px) * 4; // Pixel index
                    const weight = kernel[ky][kx];
                    
                    r += dataCopy[i] * weight;
                    g += dataCopy[i + 1] * weight;
                    b += dataCopy[i + 2] * weight;
                }
            }
            
            // Add offset for emboss filter
            if (type === 'emboss') {
                r += 128;
                g += 128;
                b += 128;
            }

            // Set the new pixel value
            const index = (y * width + x) * 4;
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
        }
    }
    
    // Put the modified data back onto the canvas
    processedCtx.putImageData(imageData, 0, 0);
}