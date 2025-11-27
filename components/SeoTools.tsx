import React, { useState } from 'react';
import { Search, Tag, Key, Lightbulb, ArrowRight, Loader2, Copy, Image as ImageIcon, X, List, Hash, Layers, RotateCcw, FileText, Heading, RefreshCw } from 'lucide-react';
import { generateSeoKeywords, SeoResult } from '../services/geminiService';

export const SeoTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'none' | 'keywords'>('none');
  
  // Keyword Generator State
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoData, setSeoData] = useState<SeoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  const handleRestart = () => {
    setInputText('');
    setSelectedImage(null);
    setPreviewUrl(null);
    setSeoData(null);
    setError(null);
  };

  const handleGenerate = async (isRegenerate = false) => {
    if (!inputText.trim() && !selectedImage) {
      setError("Por favor ingresa un texto o sube una imagen.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    // Only clear data if it is NOT a regeneration to avoid visual jumps
    if (!isRegenerate) {
        setSeoData(null);
    }

    try {
      const results = await generateSeoKeywords(inputText, selectedImage || undefined);
      setSeoData(results);
    } catch (e) {
      setError("Error al generar keywords. Verifica tu API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!seoData) return;
    
    // Order: Titles -> Description -> Primary -> Attributes
    const text = `
### TÍTULOS SEO SUGERIDOS
${seoData.seoTitles.join('\n')}

### DESCRIPCIÓN CORTA SUGERIDA
${seoData.description}

### KEYWORDS PRINCIPALES SUGERIDAS
${seoData.primary.join(', ')}

### ATRIBUTOS Y ESPECIFICACIONES RELEVANTES DETECTADOS
${seoData.attributes.join(', ')}
    `.trim();

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-6">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
            <Search size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Herramientas SEO</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Optimización de contenido y análisis de palabras clave</p>
          </div>
        </div>

        {activeTool === 'none' ? (
          /* Tools Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Feature 1: Alt Text */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 relative overflow-hidden group hover:border-orange-500 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 cursor-pointer">
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit mb-4 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors duration-300">
                <Tag size={24} className="text-neutral-600 dark:text-neutral-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all">Generador de Alt Text</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                Genera descripciones alternativas (Alt Text) optimizadas para SEO automáticamente usando IA.
              </p>
              <div className="mt-4 inline-flex items-center text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                Próximamente
              </div>
            </div>

            {/* Feature 2: Keyword Generator */}
            <div 
              onClick={() => setActiveTool('keywords')}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 relative overflow-hidden group hover:border-orange-500 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 cursor-pointer"
            >
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit mb-4 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors duration-300">
                <Lightbulb size={24} className="text-neutral-600 dark:text-neutral-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all">Generador de Keywords</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                Genera palabras clave estratégicas para productos web mediante análisis lógico profundo. Resultados "SEO-friendly" limpios de ruido social.
              </p>
              <div className="mt-4 inline-flex items-center text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                Abrir Herramienta <ArrowRight size={14} className="ml-1" />
              </div>
            </div>

          </div>
        ) : (
          /* Active Tool Interface: Keyword Generator */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
             
             {/* Left Column: Input */}
             <div className="lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm sticky top-6 hover:border-orange-500 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 group">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all">
                       <Lightbulb size={18} className="text-orange-500" /> Contexto
                     </h3>
                     <button 
                       onClick={() => setActiveTool('none')}
                       className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline"
                     >
                       Volver
                     </button>
                   </div>
                   
                   {/* Text Input */}
                   <div className="mb-4">
                      <label className="text-xs font-bold uppercase text-neutral-400 mb-2 block">Descripción o Nombre</label>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ej: Zapatillas de running ligeras..."
                        className="w-full h-32 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none resize-none transition-colors"
                      />
                   </div>

                   {/* Image Input */}
                   <div className="mb-6">
                      <label className="text-xs font-bold uppercase text-neutral-400 mb-2 block">Referencia Visual (Opcional)</label>
                      
                      {!previewUrl ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                          <ImageIcon className="text-neutral-300 mb-2 group-hover:text-orange-500 transition-colors" />
                          <span className="text-xs text-neutral-500 group-hover:text-orange-500 transition-colors">Subir imagen</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      ) : (
                        <div className="relative w-full h-48 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 group">
                           <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                           <button 
                             onClick={clearImage}
                             className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                           >
                             <X size={14} />
                           </button>
                        </div>
                      )}
                   </div>

                   <button
                     onClick={() => handleGenerate(false)}
                     disabled={isGenerating || (!inputText && !selectedImage)}
                     className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                        isGenerating || (!inputText && !selectedImage)
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-95'
                     }`}
                   >
                     {isGenerating && !seoData ? (
                       <> <Loader2 className="animate-spin" /> Analizando... </>
                     ) : (
                       <> <Search size={18} /> Generar </>
                     )}
                   </button>
                   
                   {error && (
                     <p className="text-xs text-red-500 mt-3 text-center animate-in fade-in">{error}</p>
                   )}
                </div>
             </div>

             {/* Right Column: Results */}
             <div className="lg:col-span-8">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm min-h-full flex flex-col hover:border-orange-500 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 relative group">
                   
                   {/* Overlay while regenerating */}
                   {isGenerating && seoData && (
                     <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl animate-in fade-in">
                        <div className="bg-white dark:bg-neutral-800 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-neutral-200 dark:border-neutral-700">
                           <Loader2 className="animate-spin text-orange-500" size={24} />
                           <span className="font-bold text-neutral-800 dark:text-white">Generando nuevas ideas...</span>
                        </div>
                     </div>
                   )}

                   <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all">
                       <Layers size={20} className="text-orange-500" /> Recomendaciones SEO
                     </h3>
                     <div className="flex gap-2">
                        {seoData && (
                            <>
                            <button 
                              onClick={() => handleGenerate(true)}
                              disabled={isGenerating}
                              className="text-xs flex items-center gap-1.5 text-white bg-orange-500 px-3 py-1.5 rounded-full hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Obtener nuevas sugerencias"
                            >
                              <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} /> 
                              <span className="hidden sm:inline">Regenerar</span>
                            </button>

                            <button 
                              onClick={copyToClipboard}
                              className="text-xs flex items-center gap-1.5 text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors font-bold"
                              title="Copiar texto formateado"
                            >
                              <Copy size={12} /> <span className="hidden sm:inline">Copiar</span>
                            </button>

                            <button 
                              onClick={handleRestart}
                              className="text-xs flex items-center gap-1.5 text-neutral-600 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-bold"
                              title="Reiniciar análisis"
                            >
                              <RotateCcw size={12} />
                            </button>
                            </>
                        )}
                     </div>
                   </div>

                   {!seoData ? (
                     <div className="flex-grow flex flex-col items-center justify-center text-center p-8 opacity-50 py-24">
                        <Key size={48} className="text-neutral-300 dark:text-neutral-600 mb-4" />
                        <p className="text-sm text-neutral-500">
                           Sube una imagen o texto para recibir un análisis SEO estructurado.
                        </p>
                     </div>
                   ) : (
                     <div className="space-y-6 animate-in fade-in duration-500">
                        
                        {/* Section 1: SEO Titles (Top) */}
                        <div>
                          <h4 className="text-xs font-bold uppercase text-neutral-400 mb-3 flex items-center gap-2">
                             <Heading size={12} /> Títulos SEO Sugeridos (&lt; 70 chars)
                          </h4>
                          <div className="space-y-2">
                             {seoData.seoTitles.map((title, i) => (
                               <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm hover:border-orange-200 dark:hover:border-orange-900/50 transition-colors">
                                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-xs font-bold">
                                   {i + 1}
                                 </span>
                                 <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 selection:bg-green-100">
                                   {title}
                                 </p>
                                 <span className="ml-auto text-[10px] text-neutral-400 font-mono">
                                   {title.length} chars
                                 </span>
                               </div>
                             ))}
                          </div>
                        </div>

                        {/* Section 2: Description (Middle) */}
                        <div>
                          <h4 className="text-xs font-bold uppercase text-neutral-400 mb-3 flex items-center gap-2">
                             <FileText size={12} /> Descripción / Detalles del Producto
                          </h4>
                          <div className="p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/20 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {seoData.description}
                          </div>
                        </div>

                        {/* Section 3: Primary Keywords */}
                        <div>
                          <h4 className="text-xs font-bold uppercase text-neutral-400 mb-3 flex items-center gap-2">
                             <Hash size={12} /> Keywords Principales (Volumen Alto)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                             {seoData.primary.map((k, i) => (
                               <span key={i} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-base font-bold border border-blue-100 dark:border-blue-900/40 hover:scale-105 transition-transform cursor-default">
                                 {k}
                               </span>
                             ))}
                          </div>
                        </div>

                        {/* Section 4: Attributes (Bottom) */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                          <h4 className="text-xs font-bold uppercase text-neutral-400 mb-3 flex items-center gap-2">
                             <List size={12} /> Atributos y Especificaciones
                          </h4>
                          <div className="flex flex-wrap gap-2">
                             {seoData.attributes.map((k, i) => (
                               <span key={i} className="px-2 py-1 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded text-xs border border-neutral-200 dark:border-neutral-700 font-mono">
                                 {k}
                               </span>
                             ))}
                          </div>
                        </div>

                     </div>
                   )}
                </div>
             </div>

          </div>
        )}

      </div>
    </div>
  );
};