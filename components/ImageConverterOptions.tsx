import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, FileImage, ArrowRight, RefreshCw, Maximize, Link as LinkIcon, Link2Off, Trash2, Edit3, Save, Check, Type, FileSignature, ChevronDown, ChevronRight, Square, BoxSelect, Layers, Archive, Settings2, Sliders } from 'lucide-react';
import JSZip from 'jszip';
import { FileData } from '../types';

interface ImageConverterOptionsProps {
  fileData?: FileData; // Single mode fallback
  files?: FileData[]; // Multi mode
  header?: React.ReactNode;
}

interface CustomPreset {
  id: number;
  w: number;
  h: number;
}

export const ImageConverterOptions: React.FC<ImageConverterOptionsProps> = ({ fileData, files, header }) => {
  const activeFiles = files && files.length > 0 ? files : (fileData ? [fileData] : []);
  const activeFile = activeFiles[0];

  // Initialize state from LocalStorage or Defaults
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>(() => {
    return (localStorage.getItem('tools_resizer_format') as 'image/jpeg' | 'image/png' | 'image/webp') || 'image/jpeg';
  });
  
  // Quality States separated by format
  const [jpgQuality, setJpgQuality] = useState<number>(() => {
    const saved = localStorage.getItem('tools_resizer_quality_jpg');
    return saved ? parseFloat(saved) : 0.8;
  });

  const [pngQuality, setPngQuality] = useState<number>(() => {
    const saved = localStorage.getItem('tools_resizer_quality_png');
    return saved ? parseFloat(saved) : 0.8; // Although PNG quality in Canvas is often ignored or works differently
  });
  
  // Resize State
  const [resizeWidth, setResizeWidth] = useState<number>(() => {
    return parseInt(localStorage.getItem('tools_resizer_width') || '0');
  });
  
  const [resizeHeight, setResizeHeight] = useState<number>(() => {
    return parseInt(localStorage.getItem('tools_resizer_height') || '0');
  });
  
  const [maintainAspect, setMaintainAspect] = useState(() => {
    return localStorage.getItem('tools_resizer_aspect') !== 'false';
  });

  // Fit To State
  const [fitAxis, setFitAxis] = useState<'w' | 'h'>('w');

  // Dual Output State
  const [includeSecondary, setIncludeSecondary] = useState(false);

  // Custom Presets State
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    try {
      const saved = localStorage.getItem('tools_resizer_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Renaming State
  const [enableRenaming, setEnableRenaming] = useState(false); // Manual List
  const [customNames, setCustomNames] = useState('');
  const [baseName, setBaseName] = useState('');
  const [keepOriginalNames, setKeepOriginalNames] = useState(true);
  const [isRenamingExpanded, setIsRenamingExpanded] = useState(false);
  const [isQualityExpanded, setIsQualityExpanded] = useState(true);
  const [customZipName, setCustomZipName] = useState('');

  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 });

  // Output State
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('tools_resizer_format', format);
  }, [format]);

  useEffect(() => {
    localStorage.setItem('tools_resizer_quality_jpg', jpgQuality.toString());
  }, [jpgQuality]);

  useEffect(() => {
    localStorage.setItem('tools_resizer_quality_png', pngQuality.toString());
  }, [pngQuality]);

  useEffect(() => {
    localStorage.setItem('tools_resizer_width', resizeWidth.toString());
  }, [resizeWidth]);

  useEffect(() => {
    localStorage.setItem('tools_resizer_height', resizeHeight.toString());
  }, [resizeHeight]);

  useEffect(() => {
    localStorage.setItem('tools_resizer_aspect', maintainAspect.toString());
  }, [maintainAspect]);

  useEffect(() => {
    localStorage.setItem('tools_resizer_custom_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  // Initialize dimensions from first file
  useEffect(() => {
    if (activeFile) {
      const img = new Image();
      img.src = activeFile.previewUrl;
      img.onload = () => {
        setOriginalDimensions({ w: img.width, h: img.height });
        
        // Only set resize dimensions to original if we don't have persisted user preferences (size is 0)
        if (resizeWidth === 0 || resizeHeight === 0) {
            setResizeWidth(img.width);
            setResizeHeight(img.height);
        }
      };
    }
  }, [activeFile]); 

  // Handle Dimension Changes with Aspect Ratio
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const w = parseInt(e.target.value) || 0;
    setResizeWidth(w);
    if (maintainAspect && originalDimensions.w > 0) {
      const ratio = originalDimensions.h / originalDimensions.w;
      setResizeHeight(Math.round(w * ratio));
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = parseInt(e.target.value) || 0;
    setResizeHeight(h);
    if (maintainAspect && originalDimensions.h > 0) {
      const ratio = originalDimensions.w / originalDimensions.h;
      setResizeWidth(Math.round(h * ratio));
    }
  };

  const handleFitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    
    if (fitAxis === 'w') {
        setResizeWidth(val);
        if (originalDimensions.w > 0) {
            const ratio = originalDimensions.h / originalDimensions.w;
            setResizeHeight(Math.round(val * ratio));
        }
    } else {
        setResizeHeight(val);
        if (originalDimensions.h > 0) {
            const ratio = originalDimensions.w / originalDimensions.h;
            setResizeWidth(Math.round(val * ratio));
        }
    }
  };

  const applyPreset = (w: number, h: number) => {
    setResizeWidth(w);
    setResizeHeight(h);
  };

  const resetToOriginal = () => {
    setResizeWidth(originalDimensions.w);
    setResizeHeight(originalDimensions.h);
  };
  
  const applyPerfectSquare = () => {
    if (originalDimensions.w > 0 && originalDimensions.h > 0) {
      const minDim = Math.min(originalDimensions.w, originalDimensions.h);
      applyPreset(minDim, minDim);
    }
  };

  const saveCustomPreset = () => {
    if (resizeWidth > 0 && resizeHeight > 0) {
      const newPreset = { id: Date.now(), w: resizeWidth, h: resizeHeight };
      setCustomPresets([...customPresets, newPreset]);
    }
  };

  const deleteCustomPreset = (id: number) => {
    setCustomPresets(customPresets.filter(p => p.id !== id));
  };

  const handlePopulateNames = () => {
    const names = activeFiles.map(f => f.file.name.substring(0, f.file.name.lastIndexOf('.'))).join('\n');
    setCustomNames(names);
  };

  // Convert File size to readable string
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Core Processing Function (Canvas)
  const processImageCanvas = (imgSrc: string, w: number, h: number, fmt: string, q: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imgSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // High quality scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                if (fmt === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL(fmt, q));
            } else {
                resolve(imgSrc); // Fallback
            }
        };
    });
  };

  // Track previous processing params to avoid redundant heavy work (especially PNG quality changes)
  const prevProcessRef = useRef({ w: 0, h: 0, fmt: '', q: 0, id: '' });

  // Get current active quality based on format
  const currentQuality = format === 'image/png' ? pngQuality : jpgQuality;

  // Preview Generation (Single File)
  const processPreview = useCallback(async () => {
    if (!activeFile || resizeWidth === 0 || resizeHeight === 0) return;
    
    // OPTIMIZATION: For PNG, the quality parameter is mostly ignored by standard Canvas implementations.
    // We treat quality as static for PNG to prevent expensive re-renders when dragging the slider.
    const effectiveQuality = format === 'image/png' ? -1 : jpgQuality;
    const fileId = activeFile.file.name + activeFile.file.size;

    // Skip if nothing effectively changed
    if (
        prevProcessRef.current.w === resizeWidth &&
        prevProcessRef.current.h === resizeHeight &&
        prevProcessRef.current.fmt === format &&
        prevProcessRef.current.q === effectiveQuality &&
        prevProcessRef.current.id === fileId
    ) {
        return;
    }

    setIsProcessing(true);
    
    // Use the specific quality state for processing
    const qToUse = format === 'image/png' ? pngQuality : jpgQuality;

    const newUrl = await processImageCanvas(activeFile.previewUrl, resizeWidth, resizeHeight, format, qToUse);
    setOutputUrl(newUrl);

    // Calculate approximate size
    const head = `data:${format};base64,`;
    const size = Math.round((newUrl.length - head.length) * 3 / 4);
    setOutputSize(size);
    
    setIsProcessing(false);

    // Update ref
    prevProcessRef.current = {
        w: resizeWidth,
        h: resizeHeight,
        fmt: format,
        q: effectiveQuality,
        id: fileId
    };
  }, [activeFile, format, jpgQuality, pngQuality, resizeWidth, resizeHeight]);

  // Debounce processing
  useEffect(() => {
    const timer = setTimeout(() => {
      processPreview();
    }, 500);
    return () => clearTimeout(timer);
  }, [processPreview]);

  const triggerSuccess = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Helper to get filename
  const getFinalFilename = (index: number, originalFilename: string, suffix: string | null = null) => {
    const ext = format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
    const originalNameNoExt = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
    
    let base = '';

    // Strategy 1: Keep Original
    if (keepOriginalNames) {
      base = originalNameNoExt;
    }
    // Strategy 2: Manual List
    else if (enableRenaming && customNames.split('\n')[index]) {
      base = customNames.split('\n')[index].trim();
    }
    // Strategy 3: Base Name
    else if (baseName.trim()) {
      base = `${baseName.trim()}_${index + 1}`;
    }
    // Strategy 4: Default (Original + Dimensions)
    else {
      if (suffix === null) {
          base = `${originalNameNoExt}_${resizeWidth}x${resizeHeight}`;
      } else {
          base = originalNameNoExt;
      }
    }

    return `${base}${suffix !== null ? suffix : ''}.${ext}`;
  };

  const handleDownload = async () => {
    if (activeFiles.length === 0) return;

    // Determine secondary dimension if enabled
    const secondaryW = resizeWidth === 160 ? 1000 : 160;
    const secondaryH = resizeWidth === 160 ? 1000 : 160;
    const hasSecondary = includeSecondary;

    // Use current quality
    const qToUse = format === 'image/png' ? pngQuality : jpgQuality;

    // Single File Download (Only if no secondary output)
    if (activeFiles.length === 1 && outputUrl && !hasSecondary) {
        const a = document.createElement('a');
        a.href = outputUrl;
        
        const finalName = getFinalFilename(0, activeFiles[0].file.name);
        
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        triggerSuccess();
    } else {
        // Batch Processing (Or Single File with Dual Output)
        setIsProcessing(true);
        setBatchProgress(0);
        
        try {
            const zip = new JSZip();
            
            let rootFolder: JSZip | null = zip;
            let primaryFolder: JSZip | null = null;
            let secondaryFolder: JSZip | null = null;

            if (hasSecondary) {
                // Separation logic: Create folders named after width
                primaryFolder = zip.folder(resizeWidth.toString()); // e.g. "1000"
                secondaryFolder = zip.folder(secondaryW.toString()); // e.g. "160"
            } else {
                rootFolder = zip;
            }
            
            if (!rootFolder && !primaryFolder) throw new Error("Error creating zip folder");

            for (let i = 0; i < activeFiles.length; i++) {
                const file = activeFiles[i];
                
                // 1. Process Main Image
                const dataUrl = await processImageCanvas(file.previewUrl, resizeWidth, resizeHeight, format, qToUse);
                const base64Data = dataUrl.split(',')[1];
                
                const fileName = getFinalFilename(i, file.file.name, hasSecondary ? '' : null);
                
                if (hasSecondary && primaryFolder) {
                    primaryFolder.file(fileName, base64Data, { base64: true });
                } else if (rootFolder) {
                    rootFolder.file(fileName, base64Data, { base64: true });
                }

                // 2. Process Secondary Image (if enabled)
                if (hasSecondary && secondaryFolder) {
                   const secDataUrl = await processImageCanvas(file.previewUrl, secondaryW, secondaryH, format, qToUse);
                   const secBase64Data = secDataUrl.split(',')[1];
                   const secFileName = getFinalFilename(i, file.file.name, ''); 
                   secondaryFolder.file(secFileName, secBase64Data, { base64: true });
                }

                setBatchProgress(Math.round(((i + 1) / activeFiles.length) * 100));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            
            // Determine ZIP filename
            let downloadName = '';
            if (customZipName.trim()) {
                downloadName = customZipName.trim();
                if (!downloadName.toLowerCase().endsWith('.zip')) {
                    downloadName += '.zip';
                }
            } else {
                 downloadName = activeFiles.length === 1 && hasSecondary 
                  ? `${activeFiles[0].file.name.split('.')[0]}_kit.zip` 
                  : `lote_imagenes_${activeFiles.length}_archivos.zip`;
            }

            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            triggerSuccess();

        } catch (error) {
            console.error("Batch error", error);
        } finally {
            setIsProcessing(false);
            setBatchProgress(0);
        }
    }
  };

  // Batch stats calculation
  const totalInputSize = activeFiles.reduce((acc, file) => acc + file.file.size, 0);
  const compressionRatio = activeFile && outputSize > 0 ? outputSize / activeFile.file.size : 1;
  const estimatedTotalOutput = Math.round(totalInputSize * compressionRatio);

  if (!activeFile) return null;

  const secondaryLabel = resizeWidth === 160 ? "1000 x 1000" : "160 x 160";
  const isZipDownload = activeFiles.length > 1 || includeSecondary;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {header && (
        <div className="flex items-center justify-between mb-4 min-h-[34px]">
          <div className="flex-shrink-0">
            {header}
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm overflow-y-auto custom-scrollbar">
        
        {/* --- SECTION 1: DIMENSIONS & PRESETS --- */}
        <div>
           <div className="flex items-center justify-between mb-2">
             <label className="text-xs font-bold uppercase text-neutral-500 flex items-center gap-2">
               <Maximize size={12} /> Dimensiones (px)
               {activeFiles.length === 1 && originalDimensions.w > 0 && (
                   <span className="text-[9px] normal-case font-normal text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-sm">
                     Original: {originalDimensions.w} x {originalDimensions.h} px
                   </span>
               )}
             </label>
             <button 
               onClick={saveCustomPreset}
               className="text-[10px] flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
               title="Guardar dimensión actual como preset"
             >
               <Save size={12} /> Guardar Preset
             </button>
           </div>
           
           {/* Inputs */}
           <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                 <label className="text-[10px] text-neutral-400 mb-1 block">Ancho (Width)</label>
                 <input 
                   type="number" 
                   value={resizeWidth} 
                   onChange={handleWidthChange}
                   className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-1.5 rounded text-sm font-mono focus:border-blue-500 outline-none"
                 />
              </div>
              
              <button 
                onClick={() => setMaintainAspect(!maintainAspect)}
                className={`mb-0.5 p-2 rounded transition-colors ${maintainAspect ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}
                title="Mantener relación de aspecto"
              >
                {maintainAspect ? <LinkIcon size={14} /> : <Link2Off size={14} />}
              </button>

              <div className="flex-1">
                 <label className="text-[10px] text-neutral-400 mb-1 block">Alto (Height)</label>
                 <input 
                   type="number" 
                   value={resizeHeight} 
                   onChange={handleHeightChange}
                   className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-1.5 rounded text-sm font-mono focus:border-blue-500 outline-none"
                 />
              </div>
           </div>

           {/* Practical Presets Grid */}
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => applyPreset(1000, 1000)} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-700 transition-colors">
                <Square size={12} /> 1000 x 1000
              </button>

              <button onClick={() => applyPreset(160, 160)} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-700 transition-colors">
                 <Square size={10} /> 160 x 160
              </button>
              
              <button onClick={applyPerfectSquare} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-700 transition-colors" title="Ajusta al cuadrado basado en el lado más pequeño">
                <BoxSelect size={12} /> Auto Cuadrado
              </button>
              
              <button onClick={resetToOriginal} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-700 transition-colors">
                <Maximize size={12} /> Original
              </button>
           </div>
           
           {/* Custom Presets List */}
           {customPresets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                <span className="text-[9px] text-neutral-400 mr-1">Mis Presets:</span>
                {customPresets.map(preset => (
                  <div key={preset.id} className="group relative">
                    <button 
                      onClick={() => applyPreset(preset.w, preset.h)} 
                      className="px-2 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                      {preset.w} x {preset.h}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCustomPreset(preset.id); }}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar preset"
                    >
                      <Trash2 size={8} />
                    </button>
                  </div>
                ))}
              </div>
           )}

           {/* Fit To Controls (moved below presets) */}
           <div className="mt-3 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase text-neutral-400">Ajustar A:</span>
              <div className="relative">
                 <select 
                   value={fitAxis} 
                   onChange={(e) => setFitAxis(e.target.value as 'w' | 'h')}
                   className="text-[10px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded py-1 pl-2 pr-6 appearance-none focus:outline-none focus:border-blue-500"
                 >
                    <option value="w">Ancho</option>
                    <option value="h">Alto</option>
                 </select>
                 <ChevronDown size={10} className="absolute right-1 top-1.5 text-neutral-400 pointer-events-none"/>
              </div>
              <input 
                type="number"
                placeholder="Valor..."
                onChange={handleFitChange}
                className="w-20 text-[10px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded py-1 px-2 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[9px] text-neutral-400">px (Auto)</span>
           </div>
        </div>

        <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

        {/* --- SECTION 2: FORMAT & QUALITY --- */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase text-neutral-500 mb-2 block">Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {(['image/jpeg', 'image/png', 'image/webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`
                    px-2 py-1.5 text-xs font-medium border transition-all rounded-sm
                    ${format === fmt 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-600 dark:text-neutral-400'
                    }
                  `}
                >
                  {fmt === 'image/jpeg' ? 'JPG' : fmt.split('/')[1].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
             <button 
               onClick={() => setIsQualityExpanded(!isQualityExpanded)}
               className="w-full flex items-center justify-between mb-1 group"
             >
               <label className="text-xs font-bold uppercase text-neutral-500 flex items-center gap-2 cursor-pointer group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                  <Sliders size={12} /> Calidad & Compresión
               </label>
               {isQualityExpanded ? <ChevronDown size={14} className="text-neutral-400"/> : <ChevronRight size={14} className="text-neutral-400"/>}
             </button>

             {isQualityExpanded && (
               <div className="animate-in slide-in-from-top-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-neutral-400">
                      {format === 'image/jpeg' ? 'Nivel JPG/WEBP' : 'Nivel PNG (Compresión)'}
                    </span>
                    <span className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100">{Math.round((format === 'image/png' ? pngQuality : jpgQuality) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={format === 'image/png' ? pngQuality : jpgQuality}
                    onChange={(e) => {
                       const val = parseFloat(e.target.value);
                       if (format === 'image/png') setPngQuality(val);
                       else setJpgQuality(val);
                    }}
                    className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
               </div>
             )}
          </div>
        </div>

        <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

        {/* --- SECTION 3: STATS --- */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded border border-neutral-100 dark:border-neutral-800">
            <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Entrada {activeFiles.length > 1 ? `(Total ${activeFiles.length})` : ''}</span>
            <div className="flex items-center gap-2">
              <FileImage size={14} className="text-neutral-400" />
              <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                {formatSize(totalInputSize)}
              </span>
            </div>
            {activeFiles.length === 1 && (
                <span className="text-[9px] text-neutral-400 font-mono mt-0.5 block">
                {originalDimensions.w} x {originalDimensions.h} px
                </span>
            )}
          </div>
          
          <div className="relative bg-blue-50 dark:bg-blue-900/10 p-3 rounded border border-blue-100 dark:border-blue-900/30">
            <span className="text-[9px] uppercase font-bold text-blue-400 block mb-0.5">Estimado Salida</span>
            {isProcessing && batchProgress === 0 ? (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span className="text-[10px] font-medium">Calculando...</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-blue-500" />
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
                    {formatSize(estimatedTotalOutput)}
                    </span>
                    {estimatedTotalOutput < totalInputSize && (
                    <span className="text-[9px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 py-0 rounded ml-auto">
                        -{Math.round(((totalInputSize - estimatedTotalOutput) / totalInputSize) * 100)}%
                    </span>
                    )}
                </div>
                {activeFiles.length === 1 && (
                    <span className="text-[9px] text-blue-400/80 font-mono mt-0.5 block">
                    {resizeWidth} x {resizeHeight} px
                    </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- SECTION 4: OUTPUT CONFIGURATION (Bottom) --- */}
        <div className="mt-auto pt-3 border-t-2 border-dashed border-neutral-100 dark:border-neutral-800">
           
           <h3 className="text-[10px] font-bold uppercase text-neutral-400 mb-2 flex items-center gap-1">
             <Settings2 size={10} /> Opciones de Salida
           </h3>

           {/* 4a. Dual Output Option */}
           <div className="flex items-center gap-2 mb-3 px-1">
              <button 
                onClick={() => setIncludeSecondary(!includeSecondary)}
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${includeSecondary ? 'bg-blue-500 border-blue-500 text-white' : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900'}`}
              >
                  {includeSecondary && <Check size={8} strokeWidth={3} />}
              </button>
              <span className={`text-[10px] flex items-center gap-1 ${includeSecondary ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-neutral-600 dark:text-neutral-400'}`}>
                 <Layers size={10} />
                 Incluir también versión {secondaryLabel}
              </span>
           </div>

           {/* 4b. Renaming Section */}
           <div className="mb-3">
             <button 
               onClick={() => setIsRenamingExpanded(!isRenamingExpanded)}
               className="w-full flex items-center justify-between mb-1 group"
             >
               <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-2 cursor-pointer">
                 <Edit3 size={12} className="text-neutral-400" /> Renombrar Archivos
               </label>
               <div className="flex items-center gap-2">
                 <span className="text-[9px] text-neutral-400 font-normal lowercase">
                   {keepOriginalNames ? 'Originales' : (baseName ? 'Base' : 'Custom')}
                 </span>
                 {isRenamingExpanded ? <ChevronDown size={14} className="text-neutral-400"/> : <ChevronRight size={14} className="text-neutral-400"/>}
               </div>
             </button>
             
             {isRenamingExpanded && (
               <div className="space-y-2 p-2 bg-neutral-50 dark:bg-neutral-800/30 rounded border border-neutral-100 dark:border-neutral-800 animate-in slide-in-from-top-2">
                 {/* Option 1: Keep Original */}
                 <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => setKeepOriginalNames(!keepOriginalNames)}
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${keepOriginalNames ? 'bg-blue-500 border-blue-500 text-white' : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900'}`}
                    >
                       {keepOriginalNames && <Check size={8} strokeWidth={3} />}
                    </button>
                    <span className={`text-[10px] ${keepOriginalNames ? 'text-neutral-900 dark:text-neutral-100 font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                       Mantener nombres originales
                    </span>
                 </div>

                 {/* Naming Options */}
                 {!keepOriginalNames && (
                 <div className="space-y-2 pl-1 animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* Base Name Input */}
                    <div className="flex items-center gap-2">
                       <Type size={12} className="text-neutral-400" />
                       <input 
                         type="text" 
                         value={baseName}
                         onChange={(e) => setBaseName(e.target.value)}
                         placeholder="Nombre base (Ej: Vacaciones)"
                         disabled={enableRenaming}
                         className={`flex-1 bg-white dark:bg-neutral-800 border p-1.5 rounded text-xs focus:border-blue-500 outline-none ${enableRenaming ? 'border-neutral-200 dark:border-neutral-800 text-neutral-400' : 'border-neutral-200 dark:border-neutral-700'}`}
                       />
                    </div>

                    <div className="flex items-center gap-2 my-1">
                        <div className="h-px bg-neutral-200 dark:bg-neutral-700 flex-1"></div>
                        <span className="text-[8px] font-bold text-neutral-300 dark:text-neutral-600">O</span>
                        <div className="h-px bg-neutral-200 dark:bg-neutral-700 flex-1"></div>
                    </div>

                    {/* Manual List Toggle */}
                    <div className="space-y-1">
                      <button 
                        onClick={() => {
                            setEnableRenaming(!enableRenaming);
                            if (!enableRenaming) setBaseName('');
                        }}
                        className="flex items-center gap-2 w-full group text-left"
                      >
                         <FileSignature size={12} className={`transition-colors ${enableRenaming ? 'text-blue-500' : 'text-neutral-400'}`} />
                         <span className={`text-xs transition-colors ${enableRenaming ? 'text-blue-600 font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            Usar lista manual
                         </span>
                         {enableRenaming && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handlePopulateNames(); }}
                             className="text-[9px] text-blue-500 hover:underline ml-auto"
                           >
                             Cargar actuales
                           </button>
                         )}
                      </button>
                      
                      {enableRenaming && (
                         <div className="animate-in fade-in slide-in-from-top-1">
                            <textarea 
                              value={customNames}
                              onChange={(e) => setCustomNames(e.target.value)}
                              placeholder="Un nombre por línea..."
                              className="w-full h-16 p-2 text-[10px] font-mono bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:border-blue-500 focus:outline-none resize-y"
                            />
                         </div>
                      )}
                    </div>
                 </div>
                 )}
               </div>
             )}
           </div>
           
           {/* 4c. Zip Name Input (Only show if batch or dual) */}
           {isZipDownload && (
              <div className="mb-3">
                <div className="flex items-center gap-2">
                   <Archive size={12} className="text-neutral-400" />
                   <input
                     type="text"
                     value={customZipName}
                     onChange={(e) => setCustomZipName(e.target.value)}
                     placeholder="Nombre del ZIP (Opcional)"
                     className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-1.5 rounded text-xs focus:border-blue-500 outline-none"
                   />
                </div>
              </div>
           )}
        </div>

        {/* --- SECTION 5: DOWNLOAD ACTION --- */}
        <div>
          {/* Explicit Progress Bar for Batch Processing */}
          {isProcessing && batchProgress > 0 && (
             <div className="mb-2">
                <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-0.5">
                   <span>Procesando...</span>
                   <span>{batchProgress}%</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                   <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${batchProgress}%` }}
                   ></div>
                </div>
             </div>
          )}

          <button
            onClick={handleDownload}
            disabled={!outputUrl || isProcessing || downloadSuccess}
            className={`
              w-full flex items-center justify-center gap-2 py-3.5 font-black uppercase tracking-wider transition-all relative overflow-hidden shadow-xl rounded-md text-lg
              ${downloadSuccess
                ? 'bg-emerald-500 text-white shadow-emerald-500/30 dark:shadow-emerald-900/40 transform scale-105 cursor-default'
                : (outputUrl && !isProcessing)
                  ? 'bg-green-500 hover:bg-green-400 text-white shadow-green-500/30 dark:shadow-green-900/40 transform hover:-translate-y-1 active:translate-y-0'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none'
              }
            `}
          >
            {/* Success Overlay */}
            {downloadSuccess && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500 gap-2 animate-in zoom-in duration-300 z-20">
                <Check size={28} strokeWidth={4} />
                <span>¡DESCARGADO!</span>
              </div>
            )}

            {isProcessing && batchProgress > 0 && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-green-700 transition-all duration-200 ease-out" 
                  style={{ width: `${batchProgress}%` }}
                />
            )}
            
            <div className={`relative z-10 flex items-center gap-2 ${downloadSuccess ? 'opacity-0' : 'opacity-100'}`}>
              {isProcessing && batchProgress > 0 ? (
                 <>
                   <RefreshCw size={20} className="animate-spin" />
                   <span className="text-sm">Procesando... {batchProgress}%</span>
                 </>
              ) : (
                 <>
                   <Download size={22} strokeWidth={3} />
                   {isZipDownload ? `Descargar ZIP (${activeFiles.length * (includeSecondary ? 2 : 1)})` : 'Descargar Imagen'}
                 </>
              )}
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};