import JSZip from 'jszip';

const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'svg': return 'image/svg+xml';
    default: return '';
  }
};

export const extractImagesFromZip = async (file: File): Promise<File[]> => {
  try {
    if (file.size === 0) {
      throw new Error("El archivo está vacío");
    }

    const zip = new JSZip();
    // Use arrayBuffer instead of loadAsync(file) directly for better browser compatibility with some file objects
    const arrayBuffer = await file.arrayBuffer();
    const loadedZip = await zip.loadAsync(arrayBuffer);
    
    const images: File[] = [];
    const filePromises: Promise<void>[] = [];

    loadedZip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        const name = zipEntry.name;
        const lowerName = name.toLowerCase();
        
        // Basic image extension check
        if (
          (lowerName.endsWith('.jpg') || 
           lowerName.endsWith('.jpeg') || 
           lowerName.endsWith('.png') || 
           lowerName.endsWith('.webp') ||
           lowerName.endsWith('.gif') ||
           lowerName.endsWith('.bmp')) && 
          !lowerName.includes('__macosx') && 
          !lowerName.startsWith('.')
        ) {
          const promise = zipEntry.async('blob').then((blob) => {
            // Determine correct MIME type
            const mimeType = getMimeType(name) || blob.type || 'image/png';
            
            // Create a new File with the correct type
            const imgFile = new File([blob], name.split('/').pop() || name, { 
              type: mimeType,
              lastModified: new Date().getTime() 
            });
            images.push(imgFile);
          }).catch(e => {
            console.warn("Failed to extract entry:", name, e);
          });
          
          filePromises.push(promise);
        }
      }
    });

    await Promise.all(filePromises);
    return images;
  } catch (error) {
    console.error("Error extracting ZIP:", error);
    throw new Error("No se pudo leer el archivo ZIP. Verifica que no esté corrupto.");
  }
};

export const generateAndDownloadZip = async (
  file: File,
  names: string[],
  originalExtension: string,
  onProgress?: (percent: number) => void
): Promise<void> => {
  const validNames = names.filter(n => n.trim().length > 0);

  if (validNames.length === 0) {
    // Should be handled by UI validation usually
    return;
  }

  // OPTIMIZATION: Single File Download
  if (validNames.length === 1) {
    if (onProgress) onProgress(10);
    
    const name = validNames[0].trim();
    // Ensure extension is present
    const fileName = name.toLowerCase().endsWith(`.${originalExtension}`) 
      ? name 
      : `${name}.${originalExtension}`;
    
    // Create object URL from original file
    const url = URL.createObjectURL(file);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onProgress) onProgress(100);
    return;
  }

  // ZIP Generation for multiple files
  const zip = new JSZip();
  const folderName = file.name.split('.')[0] + '_variaciones';
  const folder = zip.folder(folderName);

  if (!folder) {
    throw new Error("No se pudo crear la carpeta ZIP");
  }

  // Deduplicate names to prevent overwriting in the zip
  const uniqueNames = new Map<string, number>();

  validNames.forEach((name) => {
    const cleanName = name.trim();
    
    let finalName = cleanName;

    // Handle accidental duplicates across the whole set by appending a counter if needed
    if (uniqueNames.has(finalName)) {
      const count = uniqueNames.get(finalName)! + 1;
      uniqueNames.set(finalName, count);
      finalName = `${finalName}_${count}`;
    } else {
      uniqueNames.set(finalName, 1);
    }

    // Ensure extension is present
    const fileName = finalName.toLowerCase().endsWith(`.${originalExtension}`) 
      ? finalName 
      : `${finalName}.${originalExtension}`;

    folder.file(fileName, file);
  });

  const content = await zip.generateAsync(
    { 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 5 }
    },
    (metadata) => {
      if (onProgress) {
        onProgress(metadata.percent);
      }
    }
  );
  
  // Native download method - no external dependency needed
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};