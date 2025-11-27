import React, { useCallback, useState, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { FileData } from '../types';

interface ImageUploadProps {
  fileData?: FileData | null; // Single mode
  files?: FileData[];         // Multi mode
  multiple?: boolean;
  maxFiles?: number;
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  onClear: () => void;
  onRemoveFile?: (index: number) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  fileData, 
  files, 
  multiple = false, 
  maxFiles = 1,
  onFileSelect, 
  onFilesSelect, 
  onClear,
  onRemoveFile
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Determine if we are in multi-file mode and have files
  const hasFiles = multiple ? (files && files.length > 0) : !!fileData;

  // Reset processing state when data updates
  useEffect(() => {
    if (hasFiles) {
      setIsProcessing(false);
    }
  }, [files, fileData, hasFiles]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setIsProcessing(true);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        
        requestAnimationFrame(() => {
          if (multiple && onFilesSelect) {
            onFilesSelect(droppedFiles);
          } else if (onFileSelect && droppedFiles[0]) {
            onFileSelect(droppedFiles[0]);
          } else {
             setIsProcessing(false);
          }
        });
      }
    },
    [onFileSelect, onFilesSelect, multiple]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      const selectedFiles = Array.from(e.target.files);
      
      if (multiple && onFilesSelect) {
        onFilesSelect(selectedFiles);
      } else if (onFileSelect && selectedFiles[0]) {
        onFileSelect(selectedFiles[0]);
      }
    }
  };

  // Render Single File Preview
  if (!multiple && fileData) {
    return (
      <div className="relative w-full h-full min-h-[300px] bg-neutral-50 dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 overflow-hidden group">
        <img
          src={fileData.previewUrl}
          alt="Preview"
          className="w-full h-full object-contain p-6 opacity-90"
        />
        <div className="absolute inset-0 bg-white/80 dark:bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <button
            onClick={onClear}
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full flex items-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors text-sm font-medium"
          >
            <X size={16} />
            Eliminar imagen
          </button>
        </div>
      </div>
    );
  }

  // Render Multi File Grid
  if (multiple && files && files.length > 0) {
    return (
      <div className="relative w-full h-full min-h-[300px] bg-neutral-50 dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 flex flex-col">
        {/* Header Bar inside the box */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
           <span className="text-xs font-medium text-neutral-500">
             {files.length} / {maxFiles} archivos
           </span>
           <button 
             onClick={onClear}
             className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
           >
             <Trash2 size={12} /> Limpiar todo
           </button>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
           <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {files.map((file, idx) => (
                <div key={idx} className="relative aspect-square group bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-sm overflow-hidden">
                   <img src={file.previewUrl} alt={`File ${idx}`} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => onRemoveFile && onRemoveFile(idx)}
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <X size={14} />
                      </button>
                   </div>
                   <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] p-1 truncate px-2">
                      {file.file.name}
                   </div>
                </div>
              ))}
              
              {/* Add More Button if limit not reached */}
              {files.length < maxFiles && (
                 <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-sm cursor-pointer bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors aspect-square">
                    <Upload size={20} className="text-neutral-400 mb-1" />
                    <span className="text-[9px] font-medium text-neutral-500">Añadir</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleInputChange}
                    />
                 </label>
              )}
           </div>
        </div>
      </div>
    );
  }

  // Render Empty Dropzone
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        w-full h-full min-h-[300px] rounded-none border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center group
        ${isDragOver 
          ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800' 
          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
        }
      `}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
           <Loader2 className="w-8 h-8 text-neutral-400 dark:text-neutral-500 animate-spin mb-3" />
           <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Procesando...</p>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
          <div className={`p-4 rounded-full mb-2 transition-transform duration-300 ${isDragOver ? 'scale-110' : 'group-hover:scale-110'}`}>
            {multiple ? (
               <ImageIcon
                  className={`w-8 h-8 transition-colors ${isDragOver ? 'text-black dark:text-white' : 'text-neutral-300 dark:text-neutral-600 group-hover:text-black dark:group-hover:text-white'}`}
                  strokeWidth={1.5}
               />
            ) : (
              <Upload 
                 className={`w-8 h-8 transition-colors ${isDragOver ? 'text-black dark:text-white' : 'text-neutral-300 dark:text-neutral-600 group-hover:text-black dark:group-hover:text-white'}`} 
                 strokeWidth={1.5} 
              />
            )}
          </div>
          <p className={`text-sm font-medium mb-1 transition-colors ${isDragOver ? 'text-black dark:text-white' : 'text-neutral-900 dark:text-neutral-300'}`}>
             {isDragOver ? 'Suelta los archivos aquí' : (multiple ? 'Sube tus imágenes' : 'Sube tu imagen')}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
             {multiple ? `Arrastra hasta ${maxFiles} archivos` : 'Arrastra o haz clic para explorar'}
          </p>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple={multiple}
            onChange={handleInputChange}
          />
        </label>
      )}
    </div>
  );
};