import React from 'react';
import { 
  ArrowRight, 
  Archive, 
  FileCode, 
  Scaling, 
  Wand, 
  Zap, 
  ShieldCheck, 
  Cpu,
  FileText,
  ScanLine,
  Search
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: (tab?: 'renamer' | 'encoder' | 'resizer' | 'seo') => void;
  darkMode: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, darkMode }) => {
  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-indigo-500/30 bg-transparent text-neutral-900 dark:text-white`}>
      
      {/* Background handled by App.tsx Global Component - No internal background divs */}

      {/* Navbar Placeholder */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Wand size={20} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Genesis<span className="text-indigo-600 dark:text-indigo-400">IA</span> Tools
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 pt-12 pb-24">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-24 space-y-8 animate-in zoom-in-95 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-xs font-bold tracking-wide uppercase mb-4">
            <Zap size={12} className="fill-current" />
         v1.1.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
            <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient-x">
              Suite Inteligente de herramientas impulsadas por IA
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
           El nuevo comienzo de la gestión de contenido web.
          </p>

        </div>

        {/* FEATURES GRID */}
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Card 1: Renamer */}
            <div 
              onClick={() => onEnterApp('renamer')}
              className="group relative overflow-hidden p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-white to-indigo-50/60 dark:from-neutral-900 dark:to-indigo-950/30 hover:to-indigo-100/60 dark:hover:to-indigo-900/40 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Archive size={120} />
              </div>
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <Archive size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Renombrador</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed text-sm">
                Renombra miles de archivos al instante usando sugerencias de IA o patrones personalizados. Incluye compresión ZIP.
              </p>
              <div className="flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
                Abrir <ArrowRight size={16} className="ml-1" />
              </div>
            </div>

            {/* Card 2: Encoder */}
            <div 
              onClick={() => onEnterApp('encoder')}
              className="group relative overflow-hidden p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-white to-violet-50/60 dark:from-neutral-900 dark:to-violet-950/30 hover:to-violet-100/60 dark:hover:to-violet-900/40 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileCode size={120} />
              </div>
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 group-hover:text-violet-600 dark:group-hover:text-violet-400">
                <FileCode size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Codificador</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed text-sm">
                Vincula imágenes con bases de datos Excel, valida SKUs y renombra archivos basado en lógica compleja.
              </p>
              <div className="flex items-center text-sm font-bold text-violet-600 dark:text-violet-400 group-hover:gap-2 transition-all">
                Abrir <ArrowRight size={16} className="ml-1" />
              </div>
            </div>

            {/* Card 3: Resizer */}
            <div 
              onClick={() => onEnterApp('resizer')}
              className="group relative overflow-hidden p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-white to-pink-50/60 dark:from-neutral-900 dark:to-pink-950/30 hover:to-pink-100/60 dark:hover:to-pink-900/40 hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Scaling size={120} />
              </div>
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/50 group-hover:text-pink-600 dark:group-hover:text-pink-400">
                <Scaling size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Resizer</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed text-sm">
                Redimensionado por lotes, conversión de formato (WEBP/PNG/JPG) y optimización con presets.
              </p>
              <div className="flex items-center text-sm font-bold text-pink-600 dark:text-pink-400 group-hover:gap-2 transition-all">
                Abrir <ArrowRight size={16} className="ml-1" />
              </div>
            </div>

            {/* Card 4: SEO Tools (New) */}
            <div 
              onClick={() => onEnterApp('seo')}
              className="group relative overflow-hidden p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-white to-orange-50/60 dark:from-neutral-900 dark:to-orange-950/30 hover:to-orange-100/60 dark:hover:to-orange-900/40 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Search size={120} />
              </div>
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                <Search size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">SEO Tools</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed text-sm">
                Herramientas para optimización de contenido web, análisis de keywords y generador de Alt Text.
              </p>
              <div className="flex items-center text-sm font-bold text-orange-600 dark:text-orange-400 group-hover:gap-2 transition-all">
                Abrir <ArrowRight size={16} className="ml-1" />
              </div>
            </div>

          </div>
        </div>

        {/* ROADMAP / COMING SOON SECTION */}
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-24">
           <div className="flex items-center gap-4 mb-8">
             <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1"></div>
             <span className="text-sm font-bold uppercase tracking-widest text-neutral-400">Próximamente</span>
             <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1"></div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 opacity-60 hover:opacity-100 transition-opacity duration-500">
              <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center text-center gap-3">
                 <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                   <FileText size={20} />
                 </div>
                 <div>
                   <h4 className="font-bold text-sm">Suite PDF</h4>
                   <p className="text-[10px] text-neutral-500">Unir y Dividir PDFs</p>
                 </div>
              </div>
              <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center text-center gap-3">
                 <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                   <ScanLine size={20} />
                 </div>
                 <div>
                   <h4 className="font-bold text-sm">Metadatos</h4>
                   <p className="text-[10px] text-neutral-500">Editor y Limpiador EXIF</p>
                 </div>
              </div>
              <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center text-center gap-3">
                 <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                   <Cpu size={20} />
                 </div>
                 <div>
                   <h4 className="font-bold text-sm">Auto-Etiquetado</h4>
                   <p className="text-[10px] text-neutral-500">Etiquetado de imágenes con IA</p>
                 </div>
              </div>
           </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm py-8 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-2">
           <ShieldCheck size={16} className="text-neutral-400" />
           <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest"> • </span>
        </div>
        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Genesis IA Tools. Todos los derechos reservados.
        </p>
      </footer>

    </div>
  );
};