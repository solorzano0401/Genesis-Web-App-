import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, RefreshCw, Trash2, Download, AlertTriangle, GripVertical, CheckCircle2, FileImage, X, Database, Images, Eraser, Loader2, XCircle, Check, FileCode, List } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { EncoderItem, ExcelRow } from '../types';

interface EncoderToolProps {}

export const EncoderTool: React.FC<EncoderToolProps> = () => {
  // State
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [items, setItems] = useState<EncoderItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExcelDragOver, setIsExcelDragOver] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processType, setProcessType] = useState<'validating' | 'downloading' | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Modal States
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; index: number | null }>({ isOpen: false, index: null });
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });
  
  // Inline Alert State (For non-critical warnings)
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Refs for Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  
  // Refs for Inputs
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- HELPER: CHECK IF NAMES MODIFIED ---
  const hasModifiedNames = items.some(item => {
    const originalBase = item.originalName.replace(/\.[^/.]+$/, ""); // Remove extension
    return item.finalName !== originalBase;
  });

  // --- ACTIONS ---
  const handleClearAll = () => {
    setExcelData([]);
    setItems([]);
    setAlertMessage(null);
    setValidationProgress(0);
    setIsProcessing(false);
    setProcessType(null);
    setDownloadSuccess(false);
    if (excelInputRef.current) excelInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // --- 1. UPLOAD EXCEL ---
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      if (jsonData.length === 0) {
        setErrorModal({
           isOpen: true,
           title: "Archivo Vacío",
           message: "El archivo Excel no contiene datos."
        });
        e.target.value = '';
        return;
      }

      // Specific Column Validation
      const firstRow = jsonData[0];
      const keys = Object.keys(firstRow);
      
      const skuKey = keys.find(k => k.toUpperCase().includes('SKU'));
      const modelKey = keys.find(k => k.toUpperCase().includes('MODEL'));

      const missingColumns = [];
      if (!skuKey) missingColumns.push("SKU");
      if (!modelKey) missingColumns.push("MODEL");

      if (missingColumns.length > 0) {
        setErrorModal({
          isOpen: true,
          title: "Formato Excel Incorrecto",
          message: `Faltan las siguientes columnas obligatorias:\n\n${missingColumns.map(c => `• ${c}`).join('\n')}\n\nPor favor verifica tu archivo e intenta de nuevo.`
        });
        e.target.value = '';
        return;
      }

      // Process Rows if columns exist
      const validRows: ExcelRow[] = [];
      jsonData.forEach((row) => {
        if (row[skuKey!] && row[modelKey!]) {
          validRows.push({
            SKU: String(row[skuKey!]).trim(),
            MODEL: String(row[modelKey!]).trim()
          });
        }
      });

      setExcelData(validRows);
      setAlertMessage(null); // Clear inline alerts on success

    } catch (error) {
      console.error(error);
      setErrorModal({
        isOpen: true,
        title: "Error de Lectura",
        message: "No se pudo procesar el archivo Excel. Asegúrate de que no esté corrupto o protegido con contraseña."
      });
    }
    // Reset input
    e.target.value = '';
  };

  // --- 2. UPLOAD IMAGES ---
  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
       e.preventDefault();
       setIsDragOver(false);
       if (e.dataTransfer.files) files = Array.from(e.dataTransfer.files);
    } else if (e.target.files) {
       files = Array.from(e.target.files);
    }

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const newItems: EncoderItem[] = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      originalName: file.name,
      finalName: file.name.split('.')[0], // Default to original name initially
      match: undefined
    }));

    setItems(prev => [...prev, ...newItems]);
    setAlertMessage(null);
  };

  // --- 3. VALIDATION LOGIC ---
  const validateMatches = () => {
    if (excelData.length === 0) {
      setAlertMessage("Sube un archivo Excel primero para poder validar.");
      return;
    }
    if (items.length === 0) {
      setAlertMessage("Sube imágenes primero para poder validar.");
      return;
    }

    setIsProcessing(true);
    setProcessType('validating');
    setValidationProgress(0);
    setAlertMessage(null);

    // Simulate async processing for animation
    let current = 0;
    const total = items.length;
    
    // Create a copy to mutate
    const updatedItems = [...items];
    const skuUsageCount: Record<string, number> = {};

    const interval = setInterval(() => {
      if (current >= total) {
        clearInterval(interval);
        setItems(updatedItems);
        setIsProcessing(false);
        setProcessType(null);
        setValidationProgress(0);
        return;
      }

      // Process batch or single
      const item = updatedItems[current];
      const normalizedFileName = item.originalName.toLowerCase().replace(/[-_.\s]/g, '');

      let bestMatch: { model: string; sku: string; percentage: number } | undefined;
      let highestScore = 0;

      // Find best match in Excel
      for (const row of excelData) {
        const normalizedModel = row.MODEL.toLowerCase().replace(/[-_.\s]/g, '');
        
        // Match Logic: Initial characters or inclusion
        // We prioritize "Starts with" for higher score, then "Includes"
        let score = 0;
        
        if (normalizedFileName.startsWith(normalizedModel)) {
          score = 100;
        } else if (normalizedFileName.includes(normalizedModel)) {
          score = 80;
        } else {
           score = 0;
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = { model: row.MODEL, sku: row.SKU, percentage: score };
        }
      }

      // Update Item
      item.match = bestMatch;

      // Auto Rename Logic
      if (bestMatch && bestMatch.percentage > 0) {
        const sku = bestMatch.sku;
        if (!skuUsageCount[sku]) {
          skuUsageCount[sku] = 1;
          item.finalName = sku;
        } else {
          item.finalName = `${sku}_${skuUsageCount[sku]}`;
          skuUsageCount[sku]++;
        }
      }

      current++;
      setValidationProgress(Math.round((current / total) * 100));
    }, 20); // Speed of processing simulation
  };

  // --- 4. DRAG AND DROP ROWS ---
  const handleSort = () => {
    const dragIndex = dragItem.current;
    const hoverIndex = dragOverItem.current;
    
    if (dragIndex === null || hoverIndex === null || dragIndex === hoverIndex) return;
    
    // Duplicate array
    const _items = [...items];
    // Remove dragged item
    const draggedItemContent = _items.splice(dragIndex, 1)[0];
    // Insert at new position
    _items.splice(hoverIndex, 0, draggedItemContent);
    
    // Recalculate Names based on sequence if matches exist
    const skuUsageCount: Record<string, number> = {};
    const reorderedAndRenamedItems = _items.map(item => {
      if (item.match && item.match.percentage > 0) {
        const sku = item.match.sku;
        const count = skuUsageCount[sku] || 0;
        skuUsageCount[sku] = count + 1;
        
        // Apply sequence logic: primary -> SKU, secondary -> SKU_1, etc.
        const newName = count === 0 ? sku : `${sku}_${count}`;
        
        return { ...item, finalName: newName };
      }
      return item;
    });

    // Update reference
    dragItem.current = hoverIndex;
    dragOverItem.current = null;
    
    setItems(reorderedAndRenamedItems);
  };

  // --- 5. DELETE IMAGE ---
  const confirmDelete = () => {
    if (deleteModal.index !== null) {
       setItems(prev => prev.filter((_, i) => i !== deleteModal.index));
       setDeleteModal({ isOpen: false, index: null });
    }
  };

  // --- 6. DUPLICATE CHECK & DOWNLOAD ---
  const handleDownloadZip = async () => {
    if (items.length === 0) return;

    // Check duplicates
    const finalNames = items.map(i => i.finalName.trim().toLowerCase());
    const duplicates = finalNames.filter((item, index) => finalNames.indexOf(item) !== index);

    if (duplicates.length > 0) {
      // Use Error Modal for blocking issues
      const uniqueDuplicates = [...new Set(duplicates)];
      setErrorModal({
        isOpen: true,
        title: "Nombres Duplicados",
        message: `No se puede descargar porque hay nombres repetidos en la columna final:\n\n${uniqueDuplicates.slice(0, 5).map(d => `• ${d}`).join('\n')}${uniqueDuplicates.length > 5 ? '\n...y otros.' : ''}\n\nPor favor edita los nombres o elimina las imágenes duplicadas.`
      });
      return;
    }

    setIsProcessing(true);
    setProcessType('downloading');
    setValidationProgress(0);
    setDownloadSuccess(false);

    try {
      const zip = new JSZip();
      
      items.forEach((item) => {
        const ext = item.originalName.split('.').pop() || 'jpg';
        const filename = `${item.finalName}.${ext}`;
        zip.file(filename, item.file);
      });

      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
         setValidationProgress(metadata.percent);
      });

      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codificador_output.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);

    } catch (e) {
      console.error(e);
      setErrorModal({
        isOpen: true,
        title: "Error Generando ZIP",
        message: "Ocurrió un error inesperado al comprimir los archivos. Por favor intenta de nuevo."
      });
    } finally {
      setIsProcessing(false);
      setProcessType(null);
      setValidationProgress(0);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6 h-full min-h-[calc(100vh-4rem)]">
          
      {/* Module Header */}
      <div className="flex-none flex items-center gap-3 mb-8">
        <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl text-violet-600 dark:text-violet-400">
          <FileCode size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Codificador Inteligente</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Cruce de datos Excel y validación de imágenes</p>
        </div>
      </div>

      {/* --- INLINE WARNING ALERT (Non-blocking) --- */}
      {alertMessage && (
        <div className="flex-none bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-500" />
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">{alertMessage}</p>
          </div>
          <button onClick={() => setAlertMessage(null)}><X size={18} className="text-yellow-500" /></button>
        </div>
      )}

      {/* --- BOXES SECTION (Cards) --- */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        
        {/* Upload Excel Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 relative overflow-hidden group hover:border-violet-500 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 flex flex-col h-72">
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
              <FileSpreadsheet size={20} className="text-neutral-600 dark:text-neutral-400 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-base group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">1. Cargar Excel</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">SKU y MODEL requeridos</p>
            </div>
          </div>
          
          <div className="relative flex-1 group/drop">
            <input 
              ref={excelInputRef}
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
              onDragEnter={() => setIsExcelDragOver(true)}
              onDragLeave={() => setIsExcelDragOver(false)}
              onDrop={() => setIsExcelDragOver(false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`
              w-full h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all duration-200
              ${excelData.length > 0 
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' 
                : isExcelDragOver
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-400 dark:hover:border-neutral-700'
              }
            `}>
              {excelData.length > 0 ? (
                <>
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-800 rounded-full mb-2 text-emerald-600 dark:text-emerald-200">
                    <Database size={24} />
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{excelData.length} Modelos Cargados</p>
                  <p className="text-[10px] text-emerald-600/70 mt-1">Listo para validar</p>
                </>
              ) : (
                <>
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-2 text-neutral-400 dark:text-neutral-500 group-hover/drop:scale-110 transition-transform">
                    <FileSpreadsheet size={24} />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Arrastra tu archivo Excel</p>
                  <p className="text-[10px] text-neutral-400 mt-1">o haz clic para explorar</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Upload Images Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 relative overflow-hidden group hover:border-violet-500 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 flex flex-col h-72">
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
              <Images size={20} className="text-neutral-600 dark:text-neutral-400 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-base group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">2. Cargar Imágenes</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Soporta selección múltiple</p>
            </div>
          </div>

          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleImagesUpload}
            className="relative flex-1 group/drop"
          >
            <input 
                ref={imageInputRef}
                type="file" 
                accept="image/*"
                multiple
                onChange={handleImagesUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`
                w-full h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all duration-200
                ${items.length > 0 
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10' 
                  : isDragOver 
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10' 
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-400 dark:hover:border-neutral-700'
                }
              `}>
                {items.length > 0 ? (
                <>
                  <div className="p-3 bg-violet-100 dark:bg-violet-800 rounded-full mb-2 text-violet-600 dark:text-violet-200">
                    <Images size={24} />
                  </div>
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-400">{items.length} Imágenes Cargadas</p>
                  <p className="text-[10px] text-violet-600/70 mt-1">Arrastra más para añadir</p>
                </>
              ) : (
                <>
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-2 text-neutral-400 dark:text-neutral-500 group-hover/drop:scale-110 transition-transform">
                    <FileImage size={24} />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Sube tus imágenes aquí</p>
                  <p className="text-[10px] text-neutral-400 mt-1">Arrastra y suelta</p>
                </>
              )}
              </div>
          </div>
        </div>

      </div>

      {/* --- ACTIONS SECTION --- */}
      <div className="flex-none bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4 group hover:border-violet-500 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
              <List size={20} />
            </span>
            <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Gestión de Lista
            </span>
            {(items.length > 0 || excelData.length > 0) && (
              <button 
                onClick={handleClearAll}
                className="ml-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <Eraser size={14} /> Limpiar Todo
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={validateMatches}
              disabled={isProcessing || excelData.length === 0 || items.length === 0}
              className={`
                flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold shadow-sm transition-all text-sm uppercase tracking-wide
                ${isProcessing || excelData.length === 0 || items.length === 0
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white hover:shadow-violet-500/20 active:scale-95'
                }
              `}
            >
              <RefreshCw size={16} className={isProcessing && processType === 'validating' ? "animate-spin" : ""} />
              3. Validar
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isProcessing || items.length === 0 || downloadSuccess || !hasModifiedNames}
              className={`
                flex-1 md:flex-none relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold shadow-sm transition-all text-sm uppercase tracking-wide
                ${downloadSuccess 
                  ? 'bg-emerald-500 text-white cursor-default'
                  : (items.length > 0 && !isProcessing && hasModifiedNames)
                    ? 'bg-green-600 hover:bg-green-500 text-white hover:shadow-green-500/20 active:scale-95'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                }
              `}
              title={!hasModifiedNames ? "Modifica o valida los nombres antes de descargar" : ""}
            >
              {/* Success Overlay */}
              {downloadSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500 gap-1.5 animate-in zoom-in duration-300 z-20">
                  <Check size={16} strokeWidth={3} />
                  <span>OK</span>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && processType === 'downloading' ? (
                  <>
                  <Loader2 size={16} strokeWidth={3} className="animate-spin" />
                  <span>Zip...</span>
                  </>
              ) : (
                  <>
                  <Download size={16} strokeWidth={3} />
                  <span>4. Descargar</span>
                  </>
              )}
            </button>
          </div>
      </div>

      {/* --- PROGRESS BAR (When Processing) --- */}
      {isProcessing && (
        <div className="flex-none w-full mb-8 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold uppercase text-violet-600 dark:text-violet-400 tracking-wider flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              {processType === 'validating' ? 'Validando Coincidencias...' : 'Generando ZIP...'}
            </span>
            <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400">{Math.round(validationProgress)}%</span>
          </div>
          <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-inner">
              <div 
                className="h-full bg-violet-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${validationProgress}%` }}
              >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
              </div>
          </div>
        </div>
      )}

      {/* --- TABLE (Cards container) --- */}
      <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[400px] group hover:border-violet-500 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10">
        {/* Table Header */}
        <div className="flex-none grid grid-cols-12 gap-4 px-4 py-3 bg-neutral-100 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400">
          <div className="col-span-1 text-center">Orden</div>
          <div className="col-span-1">Img</div>
          <div className="col-span-3">Archivo Original</div>
          <div className="col-span-3">Modelo / SKU Encotrado</div>
          <div className="col-span-3">Nombre Final (Editable)</div>
          <div className="col-span-1 text-center">Acción</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 min-h-[300px]">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-full mb-2">
                  <Database size={24} className="opacity-30" />
              </div>
              <p className="text-sm font-medium">No hay elementos en la lista</p>
              <p className="text-xs mt-1 opacity-60">Sube imágenes y un Excel para comenzar</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div 
                key={item.id}
                draggable
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                className={`
                  grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-neutral-100 dark:border-neutral-900 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors
                  ${dragItem.current === index ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                  {/* Drag Handle */}
                  <div className="col-span-1 flex justify-center cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500">
                    <GripVertical size={16} />
                  </div>
                  
                  {/* Thumbnail */}
                  <div className="col-span-1">
                    <div className="w-10 h-10 rounded overflow-hidden bg-neutral-100 border border-neutral-200">
                        <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Original Name */}
                  <div className="col-span-3 truncate text-neutral-600 dark:text-neutral-400" title={item.originalName}>
                    {item.originalName}
                  </div>

                  {/* Match Info */}
                  <div className="col-span-3">
                    {item.match ? (
                      <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">{item.match.model}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${item.match.percentage === 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {item.match.percentage}%
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 font-mono">{item.match.sku}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-300 italic text-xs">- Sin coincidencia -</span>
                    )}
                  </div>

                  {/* Final Name (Editable) */}
                  <div className="col-span-3">
                    <input 
                      type="text"
                      value={item.finalName}
                      onChange={(e) => {
                        const newItem = { ...item, finalName: e.target.value };
                        const newItems = [...items];
                        newItems[index] = newItem;
                        setItems(newItems);
                      }}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 focus:border-violet-500 outline-none font-mono text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-center">
                    <button 
                      onClick={() => setDeleteModal({ isOpen: true, index })}
                      className="text-neutral-400 hover:text-red-500 transition-colors p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- DELETE MODAL --- */}
      {deleteModal.isOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl p-6 max-w-sm w-full text-center">
               <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
               </div>
               <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">¿Eliminar imagen?</h3>
               <p className="text-sm text-neutral-500 mb-6">Esta acción quitará la imagen de la lista de procesamiento.</p>
               <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteModal({ isOpen: false, index: null })}
                    className="flex-1 py-2.5 rounded font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-2.5 rounded font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Sí, Eliminar
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- CRITICAL ERROR MODAL --- */}
      {errorModal.isOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl p-6 max-w-md w-full">
               <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                     <XCircle size={28} />
                  </div>
                  <h3 className="text-lg font-bold">{errorModal.title}</h3>
               </div>
               
               <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md mb-5 border border-red-100 dark:border-red-900/30">
                 <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap font-medium leading-relaxed">
                   {errorModal.message}
                 </p>
               </div>

               <button 
                 onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                 className="w-full py-3 rounded font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
               >
                 Entendido
               </button>
            </div>
         </div>
      )}

    </div>
  );
};