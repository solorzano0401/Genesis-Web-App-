import React, { useState, useCallback, useEffect } from 'react';
import { FileData, AppState } from './types';
import { ImageUpload } from './components/ImageUpload';
import { NamesInput } from './components/NamesInput';
import { ImageConverterOptions } from './components/ImageConverterOptions';
import { EncoderTool } from './components/EncoderTool';
import { LandingPage } from './components/LandingPage';
import { SeoTools } from './components/SeoTools';
import { generateFilenamesFromImage } from './services/geminiService';
import { generateAndDownloadZip, extractImagesFromZip } from './utils/zipUtils';
import { 
  Download, 
  Check, 
  Moon, 
  Sun, 
  Loader2, 
  FileType, 
  AlertCircle, 
  Archive, 
  Image as ImageIcon, 
  Scaling, 
  FileCode, 
  XCircle, 
  Wand, 
  Home, 
  LayoutGrid, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  FileText, 
  Images, 
  Settings2
} from 'lucide-react';

const App: React.FC = () => {
  // Navigation State
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<'renamer' | 'encoder' | 'resizer' | 'seo'>('renamer');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- RENAMER STATE ---
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [namesInput, setNamesInput] = useState<string>('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetExtension, setTargetExtension] = useState<string>('jpg');
  const [extensionError, setExtensionError] = useState<string | null>(null);

  // --- RESIZER STATE ---
  // Now managing an array of files instead of a single file
  const [resizerFiles, setResizerFiles] = useState<FileData[]>([]);
  const [zipError, setZipError] = useState<string | null>(null);

  // --- GLOBAL STATE ---
  const [darkMode, setDarkMode] = useState(false);

  // Initialize Dark Mode from Local Storage or System Preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const enterApp = (tab: 'renamer' | 'encoder' | 'resizer' | 'seo' = 'renamer') => {
    setActiveTab(tab);
    setShowLanding(false);
    setIsMenuOpen(false);
  };

  const goHome = () => {
    setShowLanding(true);
    setIsMenuOpen(false);
  };

  // --- RENAMER HANDLERS ---
  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    const ext = file.name.split('.').pop() || 'jpg';
    reader.onload = (e) => {
      setFileData({
        file,
        previewUrl: e.target?.result as string,
        extension: ext,
      });
      setTargetExtension(ext); 
      setExtensionError(null);
      setErrorMessage(null);
      setDownloadSuccess(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearFile = useCallback(() => {
    setFileData(null);
    setNamesInput('');
    setErrorMessage(null);
    setDownloadSuccess(false);
    setTargetExtension('jpg');
    setExtensionError(null);
  }, []);

  const handleExtensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length === 0) {
      setExtensionError("Requerido");
    } else if (val.length > 5) {
      setExtensionError("Máx 5 letras");
    } else if (!/^[a-zA-Z0-9]+$/.test(val)) {
      setExtensionError("Solo letras/nums");
    } else {
      setExtensionError(null);
    }
    setTargetExtension(val.toLowerCase());
  };

  const handleAutoGenerate = async () => {
    if (!fileData) return;
    setAppState(AppState.GENERATING_NAMES);
    setErrorMessage(null);
    setDownloadSuccess(false);
    try {
      const suggestions = await generateFilenamesFromImage(fileData.file);
      if (suggestions.length > 0) {
        setNamesInput((prev) => {
            const cleanPrev = prev.trim();
            return cleanPrev ? `${cleanPrev}\n${suggestions.join('\n')}` : suggestions.join('\n');
        });
      }
    } catch (error) {
      setErrorMessage("Error al generar nombres. Verifica tu API key.");
    } finally {
      setAppState(AppState.IDLE);
    }
  };

  const handleDownload = async () => {
    if (!fileData || !namesInput.trim() || extensionError) return;

    setAppState(AppState.PROCESSING_ZIP);
    setProgress(0);
    setErrorMessage(null);
    setDownloadSuccess(false);

    try {
      const namesList = namesInput
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);
      
      if (namesList.length === 0) {
          setErrorMessage("Por favor ingresa al menos un nombre válido.");
          setAppState(AppState.IDLE);
          return;
      }

      await generateAndDownloadZip(
        fileData.file, 
        namesList, 
        targetExtension, 
        (percent) => setProgress(Math.round(percent))
      );
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      setErrorMessage("Ocurrió un error al crear el archivo ZIP.");
    } finally {
      setAppState(AppState.IDLE);
      setProgress(0);
    }
  };

  // --- RESIZER HANDLERS ---
  const handleResizerFilesSelect = useCallback(async (files: File[]) => {
    setZipError(null);
    const MAX_FILES = 25;
    
    // Flatten files (handle zips)
    let processedFiles: File[] = [];
    let errors: string[] = [];

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip') || file.type.includes('x-zip')) {
        try {
          const extracted = await extractImagesFromZip(file);
          if (extracted.length === 0) {
            errors.push(`El ZIP "${file.name}" no contiene imágenes válidas.`);
          } else {
            processedFiles = [...processedFiles, ...extracted];
          }
        } catch (e) {
          errors.push(`Error al leer "${file.name}". Puede estar corrupto o protegido.`);
        }
      } else {
        processedFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setZipError(errors.join('\n'));
    }

    if (processedFiles.length === 0) return;

    const currentCount = resizerFiles.length;
    const slotsAvailable = MAX_FILES - currentCount;
    
    if (slotsAvailable <= 0) {
      if (errors.length === 0) setZipError("Has alcanzado el límite de 25 archivos.");
      return;
    }

    const filesToProcess = processedFiles.slice(0, slotsAvailable);
    
    if (processedFiles.length > slotsAvailable) {
       setZipError(prev => (prev ? prev + '\n' : '') + `Solo se añadieron ${slotsAvailable} archivos (Límite alcanzado).`);
    }
    
    const newFilesData = await Promise.all(filesToProcess.map(file => new Promise<FileData>((resolve) => {
        const reader = new FileReader();
        const ext = file.name.split('.').pop() || 'jpg';
        reader.onload = (e) => {
            resolve({
                file,
                previewUrl: e.target?.result as string,
                extension: ext,
            });
        };
        reader.readAsDataURL(file);
    })));

    setResizerFiles(prev => [...prev, ...newFilesData]);
  }, [resizerFiles]);

  const handleResizerClearAll = useCallback(() => {
    setResizerFiles([]);
    setZipError(null);
  }, []);

  const handleRemoveResizerFile = useCallback((index: number) => {
    setResizerFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const rawFileCount = namesInput.split('\n').filter(l => l.trim()).length;
  const totalFileCount = rawFileCount;
  const canDownload = fileData !== null && rawFileCount > 0 && appState === AppState.IDLE && !extensionError;

  // --- RENDER SECTIONS ---

  const renderRenamerContent = () => (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6 h-full min-h-[calc(100vh-4rem)]">
      
      {/* Module Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
          <Archive size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Renombrador Masivo</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Renombrado inteligente y compresión de archivos</p>
        </div>
      </div>

      {errorMessage && (
        <div className="flex-none mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border-l-2 border-red-500 rounded-r-sm animate-in fade-in slide-in-from-top-2">
           {errorMessage}
        </div>
      )}

      {/* Main Grid - Auto fills remaining height on desktop */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        {/* Left Column: Upload */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-[400px]">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col h-full hover:border-indigo-500 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 group">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                <ImageIcon size={18} className="group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all" />
              </div>
              <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all">Imagen de Origen</h3>
            </div>
            
            <label className="text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
              Vista Previa
            </label>
            
            <div className="flex-1 min-h-[calc(100vh-25rem)] lg:min-h-[200px] relative">
              <div className="absolute inset-0">
                <ImageUpload 
                  fileData={fileData} 
                  onFileSelect={handleFileSelect} 
                  onClear={handleClearFile} 
                />
              </div>
            </div>

            {/* Extension Selector */}
            {fileData && (
              <div className="mt-4 flex-none animate-in fade-in slide-in-from-top-2">
                 <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500">
                      Extensión de Salida
                    </label>
                    {extensionError && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                         <AlertCircle size={10} /> {extensionError}
                      </span>
                    )}
                 </div>
                <div className={`flex items-center gap-2 bg-white dark:bg-neutral-900 border p-3 rounded-none shadow-sm transition-colors ${extensionError ? 'border-red-500 dark:border-red-500' : 'border-neutral-200 dark:border-neutral-800'}`}>
                   <div className={`p-2 rounded-full transition-colors ${extensionError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                      <FileType size={16} className={`${extensionError ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`} />
                   </div>
                   <div className="flex-grow flex items-center gap-1">
                      <span className="text-neutral-400 dark:text-neutral-600 font-mono select-none">.</span>
                      <input 
                        type="text" 
                        value={targetExtension}
                        onChange={handleExtensionChange}
                        className={`w-full bg-transparent border-none focus:ring-0 text-sm font-bold font-mono p-0 placeholder:text-neutral-300 ${extensionError ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}
                        placeholder="jpg"
                      />
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Names Input */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
           <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col h-full hover:border-indigo-500 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 group">
             
             {/* Names Input Component */}
             <div className="flex-1 min-h-[300px] flex flex-col">
                <NamesInput 
                    header={
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                          <FileText size={18} className="group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all" />
                        </div>
                        <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all">Nuevos Nombres</h3>
                      </div>
                    }
                    value={namesInput} 
                    onChange={setNamesInput} 
                    onAutoGenerate={handleAutoGenerate}
                    isGenerating={appState === AppState.GENERATING_NAMES}
                    hasFile={!!fileData}
                    fileExtension={!extensionError ? targetExtension : '...'} 
                />
             </div>

             {/* Download Action Section - Inside Card */}
             <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex-none">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      {totalFileCount} {totalFileCount === 1 ? 'archivo' : 'archivos'} a generar
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-600">
                      {fileData ? ((fileData.file.size * totalFileCount) / 1024 / 1024).toFixed(2) : '0.00'} MB estimado
                    </span>
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={!canDownload && !downloadSuccess}
                    className={`
                      relative w-full sm:w-auto min-w-[280px] overflow-hidden flex items-center justify-center gap-3 px-8 py-4 text-lg font-black tracking-wider transition-all duration-300 rounded-md shadow-lg
                      ${downloadSuccess 
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 dark:shadow-emerald-900/40 transform scale-105 cursor-default'
                        : (canDownload || appState === AppState.PROCESSING_ZIP)
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

                    {/* Progress Bar Background */}
                    {appState === AppState.PROCESSING_ZIP && (
                      <div className="absolute inset-0 bg-green-700" />
                    )}
                    
                    {/* Progress Bar Fill */}
                    {appState === AppState.PROCESSING_ZIP && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-200 ease-out" 
                        style={{ width: `${progress}%` }}
                      />
                    )}

                    {/* Content Layer */}
                    <div className={`relative z-10 flex items-center gap-2 ${downloadSuccess ? 'opacity-0' : 'opacity-100'}`}>
                      {appState === AppState.PROCESSING_ZIP ? (
                        <>
                          <Loader2 size={24} strokeWidth={3} className="animate-spin" />
                          <span className="tabular-nums text-base">
                            {totalFileCount === 1 ? 'PROCESANDO...' : `COMPRIMIENDO... ${progress}%`}
                          </span>
                        </>
                      ) : (
                        <>
                          <Download size={24} strokeWidth={3} />
                          {totalFileCount === 1 ? 'DESCARGAR ARCHIVO' : 'DESCARGAR ZIP'}
                        </>
                      )}
                    </div>
                  </button>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderResizerContent = () => (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6 h-full min-h-[calc(100vh-4rem)]">
      
      {/* Module Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400">
            <Scaling size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Redimensionador de Imágenes</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Optimización, conversión de formatos y ajuste de tamaño</p>
          </div>
        </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-6">
        {/* Left: Upload */}
        <div className="flex flex-col h-full min-h-[400px]">
           <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col h-full hover:border-pink-500 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 group">
             <div className="flex-none flex items-center gap-2 mb-4">
                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300">
                   <Images size={18} className="group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all" />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all">Imágenes ({resizerFiles.length}/25)</h3>
             </div>
             
             <label className="text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
               Entrada por lotes
             </label>
             <div className="flex-1 min-h-[calc(100vh-25rem)] lg:min-h-[300px] relative">
               <div className="absolute inset-0">
                <ImageUpload
                  files={resizerFiles}
                  multiple={true}
                  maxFiles={25}
                  onFilesSelect={handleResizerFilesSelect}
                  onClear={handleResizerClearAll}
                  onRemoveFile={handleRemoveResizerFile}
                />
               </div>
             </div>
           </div>
        </div>
        
        {/* Right: Controls */}
        <div className="flex flex-col h-full min-h-[500px]">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col h-full hover:border-pink-500 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 group">
            {/* Header managed internally if needed or external for alignment */}
            <div className="flex-none flex items-center gap-2 mb-4">
               <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300">
                  <Settings2 size={18} className="group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all" />
               </div>
               <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all">Configuración</h3>
            </div>
            
            <label className="text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500 mb-2 block">
               Opciones de Salida
            </label>
            <div className="flex-1 min-h-[400px] flex flex-col">
              {resizerFiles.length > 0 ? (
                <ImageConverterOptions 
                  files={resizerFiles}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 border-dashed rounded-none">
                    <div className="text-center text-neutral-400 dark:text-neutral-600">
                      <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Sube imágenes primero para ver las opciones</p>
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const MenuOption = ({ id, label, icon: Icon, description }: { id: typeof activeTab, label: string, icon: any, description: string }) => (
    <button
      onClick={() => enterApp(id)}
      className={`
        w-full text-left flex items-center gap-4 p-3 rounded-lg transition-all duration-200 group
        ${activeTab === id 
           ? 'bg-neutral-100 dark:bg-neutral-800' 
           : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        }
      `}
    >
      <div className={`
        p-2.5 rounded-lg transition-colors
        ${activeTab === id
           ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
           : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-white dark:group-hover:bg-neutral-700 shadow-sm'
        }
      `}>
         <Icon size={18} />
      </div>
      <div className="flex flex-col">
         <span className={`text-sm font-bold ${activeTab === id ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
            {label}
         </span>
         <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">{description}</span>
      </div>
      {activeTab === id && (
         <div className="ml-auto">
            <div className="w-1.5 h-1.5 bg-neutral-900 dark:bg-white rounded-full"></div>
         </div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 transition-colors duration-300 relative">
      
      {/* Global Background Gradients & Grid - Persists across all views */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] ${darkMode ? 'opacity-20' : 'opacity-100'}`}></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-violet-500/10 blur-[100px] rounded-full mix-blend-screen"></div>
      </div>

      {/* Error Modal for ZIPs */}
      {zipError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-lg shadow-2xl max-w-md w-full relative z-50">
            <div className="flex items-center gap-3 text-red-600 mb-4">
               <XCircle size={24} />
               <h3 className="text-lg font-bold">Error de Archivos</h3>
            </div>
            <pre className="text-xs bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 p-3 rounded mb-4 whitespace-pre-wrap font-mono">
              {zipError}
            </pre>
            <button 
              onClick={() => setZipError(null)}
              className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2 rounded font-medium hover:opacity-90"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Conditional Rendering based on Navigation State */}
      {showLanding ? (
        <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
           {/* Landing Page Dark Mode Toggle */}
           <div className="fixed top-6 right-6 z-50">
             <button
                 onClick={toggleDarkMode}
                 className="p-3 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors shadow-sm"
                 title="Toggle Theme"
               >
                 {darkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>
           </div>
           <LandingPage onEnterApp={enterApp} darkMode={darkMode} />
        </div>
      ) : (
        <>
          {/* Header Navigation */}
          <header className="flex-none z-40 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-all duration-300 relative">
            <div className="h-16 flex items-center justify-between px-4 md:px-6">
              
              {/* Left: Logo & Dropdown Trigger */}
              <div className="flex items-center gap-2 md:gap-6">
                 {/* Logo (Home) */}
                 <div 
                  onClick={goHome}
                  className="flex items-center gap-2 md:gap-3 cursor-pointer group"
                 >
                   <div className="bg-gradient-to-br from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 text-white p-2 md:p-2.5 rounded-lg md:rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                     <Wand className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                   </div>
                   <div className="flex flex-col leading-tight">
                     <span className="text-base md:text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                       Genesis<span className="text-indigo-600 dark:text-indigo-400">IA</span>
                     </span>
                     <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 tracking-wider hidden sm:inline-block">
                       Web content tools
                     </span>
                   </div>
                 </div>

                 {/* Divider */}
                 <div className="h-6 md:h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>

                 {/* Tool Selector Dropdown Trigger */}
                 <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className={`
                        flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-2 rounded-full border transition-all duration-200
                        ${isMenuOpen 
                          ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white'
                          : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                        }
                      `}
                    >
                       <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" />
                       <span className="text-xs md:text-sm font-semibold">Herramientas</span>
                       {isMenuOpen ? <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    </button>
                    
                    {/* Dropdown Menu Panel */}
                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-3 w-[260px] md:w-[300px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                           <div className="text-[10px] font-bold uppercase text-neutral-400 px-3 py-2">Seleccionar Módulo</div>
                           <div className="space-y-1">
                              <MenuOption 
                                id="renamer" 
                                label="Renombrador Zip" 
                                icon={Archive} 
                                description="Nombres masivos con IA" 
                              />
                              <MenuOption 
                                id="encoder" 
                                label="Codificador" 
                                icon={FileCode} 
                                description="Excel y Validación SKU"
                              />
                              <MenuOption 
                                id="resizer" 
                                label="Img Resizer" 
                                icon={Scaling} 
                                description="Redimensionado y Formatos"
                              />
                              <MenuOption 
                                id="seo" 
                                label="Herramientas SEO" 
                                icon={Search} 
                                description="Keywords y Optimización"
                              />
                           </div>
                        </div>
                      </>
                    )}
                 </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <button
                  onClick={goHome}
                  className="p-2 md:p-3 rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors focus:outline-none border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                  title="Volver al Inicio"
                >
                  <Home className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 md:p-3 rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors focus:outline-none border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                  aria-label="Toggle Dark Mode"
                  title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                  {darkMode ? <Sun className="w-4 h-4 md:w-[18px] md:h-[18px]" /> : <Moon className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden relative flex flex-col z-10">
             <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {/* Added animation wrapper with key to trigger re-animation on tab change */}
                <div key={activeTab} className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                  {activeTab === 'renamer' && renderRenamerContent()}
                  
                  {/* ENCODER TAB IMPLEMENTATION */}
                  {activeTab === 'encoder' && (
                    <EncoderTool />
                  )}
                  
                  {activeTab === 'resizer' && renderResizerContent()}

                  {/* SEO TAB IMPLEMENTATION */}
                  {activeTab === 'seo' && (
                    <SeoTools />
                  )}
                </div>
             </div>
          </main>
        </>
      )}

    </div>
  );
};

export default App;