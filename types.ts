
export interface FileData {
  file: File;
  previewUrl: string;
  extension: string;
}

export interface RenameJob {
  originalFile: File;
  targetNames: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING_ZIP = 'PROCESSING_ZIP',
  GENERATING_NAMES = 'GENERATING_NAMES',
}

// New Types for Encoder
export interface ExcelRow {
  SKU: string;
  MODEL: string;
}

export interface EncoderItem {
  id: string; // Unique ID for Drag and Drop
  file: File;
  previewUrl: string;
  originalName: string;
  match?: {
    model: string;
    sku: string;
    percentage: number;
  };
  finalName: string;
}
