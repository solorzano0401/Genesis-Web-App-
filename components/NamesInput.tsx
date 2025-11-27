import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Sparkles, FileSpreadsheet, Loader2, FileType, Eye, AlertCircle, Trash2, CheckCircle2, Pencil } from 'lucide-react';
import { parseNamesFile } from '../utils/parserUtils';

interface NamesInputProps {
  value: string;
  onChange: (value: string) => void;
  onAutoGenerate: () => void;
  isGenerating: boolean;
  hasFile: boolean;
  fileExtension?: string;
  header?: React.ReactNode;
}

interface PreviewItem {
  displayText: string;
  baseName: string;
  sourceIndex: number;
}

export const NamesInput: React.FC<NamesInputProps> = ({ 
  value, 
  onChange, 
  onAutoGenerate, 
  isGenerating,
  hasFile,
  fileExtension = 'ext',
  header
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  
  // State for editing preview items
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const rawLines = value.split('\n');
  const lineCount = rawLines.filter(line => line.trim() !== '').length;

  // Calculate preview names with deduplication logic and track source index
  const previewList = useMemo<PreviewItem[]>(() => {
    const uniqueNames = new Map<string, number>();
    const results: PreviewItem[] = [];

    rawLines.forEach((line, index) => {
      const cleanName = line.trim();
      if (!cleanName) return;

      let finalName = cleanName;
      
      // Handle duplicates logic purely for preview
      if (uniqueNames.has(cleanName)) {
        const count = uniqueNames.get(cleanName)! + 1;
        uniqueNames.set(cleanName, count);
        finalName = `${cleanName}_${count}`;
      } else {
        uniqueNames.set(cleanName, 1);
      }

      // Append extension if not present
      const hasExt = finalName.toLowerCase().endsWith(`.${fileExtension}`);
      const displayText = hasExt ? finalName : `${finalName}.${fileExtension}`;
      
      results.push({
        displayText,
        baseName: finalName,
        sourceIndex: index
      });
    });

    return results;
  }, [value, fileExtension]);

  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingIndex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      setImportError("Solo archivos .csv, .xlsx o .xls");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const names = await parseNamesFile(file);
      if (names.length > 0) {
        const newValue = value.trim() 
          ? `${value.trim()}\n${names.join('\n')}` 
          : names.join('\n');
        onChange(newValue);
        setImportError(null);
        setImportSuccess(`¡Éxito! ${names.length} nombres añadidos`);
        setTimeout(() => setImportSuccess(null), 4000);
      } else {
        setImportError("El archivo no contiene datos válidos");
      }
    } catch (error) {
      console.error("Error parsing file", error);
      setImportError("Error al leer el archivo");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    onChange('');
    setImportError(null);
    setImportSuccess(null);
  };

  const handleStartEdit = (item: PreviewItem) => {
    setEditingIndex(item.sourceIndex);
    // Pre-fill with the base name used in preview (or the raw line if preferred, but baseName handles the de-duped visualization context better for users)
    // Actually, let's let them edit the deduplicated name, but realize it updates the source line.
    setEditValue(item.baseName); 
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const newLines = [...rawLines];
    // Update the specific line
    if (newLines[editingIndex] !== undefined) {
      newLines[editingIndex] = editValue.trim();
    }
    
    onChange(newLines.join('\n'));
    setEditingIndex(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  };

  return (
    <div className="flex flex-col relative h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-4 min-h-[34px]">
        <div className="flex-shrink-0">
          {header}
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pl-2">
           <div className="flex items-center gap-1 mr-2 whitespace-nowrap">
             <span className="text-xs font-bold text-neutral-300 dark:text-neutral-700 hidden sm:inline">|</span>
             <span className="text-xs text-neutral-400 dark:text-neutral-500">{lineCount} ítems</span>
          </div>

          {importError && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-100 dark:border-red-900 animate-in fade-in slide-in-from-right-2 whitespace-nowrap">
              <AlertCircle size={12} />
              <span className="text-[10px] font-medium">{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-900 animate-in fade-in slide-in-from-right-2 shadow-sm whitespace-nowrap">
              <CheckCircle2 size={14} />
              <span className="text-[11px] font-medium">{importSuccess}</span>
            </div>
          )}

          <button
            onClick={handleClear}
            disabled={!value.trim()}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all border rounded-md whitespace-nowrap
              ${!value.trim() 
                ? 'border-transparent text-neutral-300 dark:text-neutral-700 cursor-not-allowed' 
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-neutral-900'
              }
            `}
            title="Borrar toda la lista"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Limpiar</span>
          </button>

          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-200 border rounded-md whitespace-nowrap shadow-sm
              border-neutral-200 dark:border-neutral-700 
              bg-white dark:bg-neutral-900 
              text-neutral-600 dark:text-neutral-400
              hover:border-emerald-500 dark:hover:border-emerald-500
              hover:bg-emerald-500 dark:hover:bg-emerald-500
              hover:text-white dark:hover:text-white
              hover:shadow-emerald-500/20
              disabled:opacity-50 disabled:cursor-wait
            `}
            title="Importar desde Excel o CSV (Primera columna)"
          >
            {isImporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={12} />
            )}
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={onAutoGenerate}
            disabled={!hasFile || isGenerating}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all border rounded-md whitespace-nowrap
              ${!hasFile 
                ? 'border-transparent text-neutral-300 dark:text-neutral-700 cursor-not-allowed' 
                : isGenerating
                  ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-wait'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white bg-white dark:bg-neutral-900 shadow-sm'
              }
            `}
          >
            {isGenerating ? (
              "Generando..."
            ) : (
              <>
                <Sparkles size={12} />
                <span className="hidden sm:inline">Sugerir IA</span>
                <span className="sm:hidden">IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* Editor Area */}
        <div className="relative flex flex-col h-full">
           <label className="text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500 mb-2 ml-1">Editor Manual</label>
           <textarea
            className="w-full h-full min-h-[300px] p-5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600 focus:bg-white dark:focus:bg-neutral-950 transition-all duration-200 rounded-none text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-700 focus:outline-none resize-none font-mono leading-relaxed shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700"
            placeholder={`Escribe manualmente o importa...\n\nEjemplo:\nnombre-archivo-01\nnombre-archivo-02`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
          {!hasFile && !value && (
             <div className="absolute inset-0 top-8 flex items-center justify-center pointer-events-none">
               <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm px-5 py-3 text-neutral-400 dark:text-neutral-500 text-xs border border-neutral-200 dark:border-neutral-800 text-center rounded-sm shadow-sm">
                 Escribe o pega tu lista aquí
               </div>
             </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="relative flex flex-col h-full">
           <label className="text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500 mb-2 ml-1 flex items-center gap-1">
             <Eye size={10} />
             Vista Previa Salida
           </label>
           <div className="w-full h-full min-h-[300px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-none overflow-hidden flex flex-col shadow-sm">
             {previewList.length === 0 ? (
               <div className="flex-grow flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-700 p-6 text-center bg-neutral-50/30 dark:bg-neutral-900/30">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-full mb-3">
                    <FileType size={24} strokeWidth={1.5} className="opacity-50 text-neutral-400 dark:text-neutral-600"/>
                  </div>
                  <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Sin nombres definidos</span>
                  <span className="text-[10px] text-neutral-300 dark:text-neutral-700 mt-1">La vista previa se actualizará automáticamente</span>
               </div>
             ) : (
               <div className="overflow-y-auto p-0 flex-grow scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                 <ul className="divide-y divide-neutral-50 dark:divide-neutral-800">
                   {previewList.map((item, idx) => (
                     <li 
                       key={`${item.sourceIndex}-${idx}`} 
                       onDoubleClick={() => handleStartEdit(item)}
                       className={`
                         group flex items-center gap-3 px-4 py-2.5 text-sm font-mono transition-colors duration-200 cursor-text
                         ${editingIndex === item.sourceIndex 
                           ? 'bg-blue-50 dark:bg-blue-900/20' 
                           : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                         }
                       `}
                       title="Doble clic para editar"
                     >
                       <span className="text-[10px] font-medium text-neutral-300 dark:text-neutral-700 w-6 text-right select-none flex-shrink-0">
                         {idx + 1}
                       </span>
                       
                       <FileType size={14} className="text-neutral-300 dark:text-neutral-700 flex-shrink-0" />
                       
                       {editingIndex === item.sourceIndex ? (
                         <div className="flex-grow flex items-center">
                           <input
                             ref={editInputRef}
                             type="text"
                             value={editValue}
                             onChange={(e) => setEditValue(e.target.value)}
                             onBlur={handleSaveEdit}
                             onKeyDown={handleKeyDown}
                             className="w-full bg-transparent border-b border-blue-500 focus:outline-none text-neutral-900 dark:text-neutral-100 px-0 py-0 h-auto leading-none rounded-none"
                           />
                           <span className="text-neutral-400 dark:text-neutral-600 select-none">.{fileExtension}</span>
                         </div>
                       ) : (
                         <div className="flex items-center justify-between w-full">
                            <span className="truncate group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors">
                              {item.displayText}
                            </span>
                            <Pencil size={10} className="opacity-0 group-hover:opacity-100 text-neutral-400 transition-opacity" />
                         </div>
                       )}
                     </li>
                   ))}
                 </ul>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};