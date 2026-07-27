import React, { useEffect, useState } from 'react';

interface SchoolLogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

// Keep a global cache to avoid processing the image repeatedly across mounts
let cachedProcessedLogo: string | null = null;

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ size = 64, showText = false }) => {
  const [logoSrc, setLogoSrc] = useState<string>(cachedProcessedLogo || '/logo.png.jpeg');

  useEffect(() => {
    if (cachedProcessedLogo) return;

    const img = new Image();
    img.src = '/logo.png.jpeg';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        // BFS flood fill starting from all 4 borders of the image to only remove the background white,
        // keeping white details inside the logo itself intact.
        for (let x = 0; x < width; x++) {
          queue.push(x, 0);
          visited[x] = 1;
          queue.push(x, height - 1);
          visited[x + (height - 1) * width] = 1;
        }
        for (let y = 1; y < height - 1; y++) {
          queue.push(0, y);
          visited[y * width] = 1;
          queue.push(width - 1, y);
          visited[(width - 1) + y * width] = 1;
        }

        let head = 0;
        while (head < queue.length) {
          const cx = queue[head++];
          const cy = queue[head++];
          const idx = (cx + cy * width) * 4;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // If the pixel is close to white, make it transparent and propagate.
          if (r > 215 && g > 215 && b > 215) {
            data[idx + 3] = 0; // Set Alpha to 0

            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1]
            ];

            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = nx + ny * width;
                if (visited[nidx] === 0) {
                  visited[nidx] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        cachedProcessedLogo = dataUrl;
        setLogoSrc(dataUrl);
      } catch (e) {
        console.error('Failed to process transparent logo image:', e);
      }
    };
  }, []);

  const height = showText ? size * 1.8 : size;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <img 
        src={logoSrc} 
        alt="GMIS Logo" 
        style={{ 
          width: size, 
          height: height, 
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08))'
        }} 
      />
    </div>
  );
};
