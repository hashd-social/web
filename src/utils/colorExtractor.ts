/**
 * Extract dominant color from an image element
 * Note: Will return fallback color for CORS-restricted images
 */
export const extractColorFromImageElement = (imgElement: HTMLImageElement): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return 'rgb(30, 58, 138)';
    }
    
    // Use small size for faster processing
    const size = 50;
    canvas.width = size;
    canvas.height = size;
    
    // Draw image to canvas
    ctx.drawImage(imgElement, 0, 0, size, size);
    
    // Try to get image data - will throw SecurityError if CORS-restricted
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, size, size);
    } catch (securityError) {
      console.warn('Image is CORS-restricted, cannot extract colors. Using default.');
      return 'rgb(30, 58, 138)';
    }
    
    const pixels = imageData.data;
    
    // Count color frequencies (simplified - just get most common color)
    const colorCounts: { [key: string]: number } = {};
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // Skip transparent or very light/dark pixels
      if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) {
        continue;
      }
      
      // Reduce precision to group similar colors
      const rBucket = Math.floor(r / 32) * 32;
      const gBucket = Math.floor(g / 32) * 32;
      const bBucket = Math.floor(b / 32) * 32;
      
      const colorKey = `${rBucket},${gBucket},${bBucket}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
    
    // Find most common color
    let maxCount = 0;
    let dominantColor = '30,58,138'; // Default darker blue
    
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }
    
    const [r, g, b] = dominantColor.split(',').map(Number);
    const result = `rgb(${r}, ${g}, ${b})`;
    console.log('Extracted dominant color:', result);
    return result;
  } catch (error) {
    console.error('Error extracting color:', error);
    return 'rgb(30, 58, 138)';
  }
};
