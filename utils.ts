import type { Reference } from './types';

export const transformGoogleSheetUrl = (url: string): string => {
    // Regex to capture the sheet ID from various Google Sheets URL formats
    const match = url.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
        const sheetId = match[1];
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    }
    return url;
};

export const fetchContent = async (file: File | null, url: string): Promise<string> => {
    if (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Error al leer el archivo. Por favor, comprueba la integridad del archivo o intenta con uno diferente.'));
        reader.readAsText(file);
      });
    }
    if (url) {
      try {
        const finalUrl = transformGoogleSheetUrl(url);
        // Use a CORS proxy to prevent cross-origin issues when fetching from the browser
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
        
        const response = await fetch(proxiedUrl);
        if (!response.ok) {
          throw new Error(`Error al obtener la URL (${response.status} ${response.statusText})`);
        }
        return response.text();
      } catch (e: any) {
        throw new Error(`No se pudo acceder a la URL. Verifica que el enlace sea correcto y público. (${e.message})`);
      }
    }
    throw new Error('No se proporcionó archivo ni URL.');
};

export const detectDelimiterAndSplit = (content: string): { delimiter: string; lines: string[] } => {
    const lines = content.trim().split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
        return { delimiter: ',', lines: [] };
    }
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    return { delimiter, lines };
};