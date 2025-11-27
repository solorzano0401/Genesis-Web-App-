import * as XLSX from 'xlsx';

/**
 * Parses an Excel or CSV file and extracts the first column as a list of strings.
 */
export const parseNamesFile = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON (array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Extract the first column, filtering out empty values
        // We skip the first row if it looks like a header (optional, but good practice)
        const extractedNames: string[] = [];
        
        jsonData.forEach((row, index) => {
          if (row && row.length > 0 && row[0]) {
            const value = String(row[0]).trim();
            if (value) {
              extractedNames.push(value);
            }
          }
        });

        resolve(extractedNames);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);

    reader.readAsArrayBuffer(file);
  });
};