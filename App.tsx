import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Reference, Currency, SortableKeys, SortConfig, ImportStats } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Footer } from './Footer';
import CookieConsent from './CookieConsent';
import { DataTable } from './DataTable';
import { StatisticsPanel } from './StatisticsPanel';
import { DataSourceCard } from './DataSourceCard';
import { fetchContent, detectDelimiterAndSplit } from './utils';

// Helper Icon Components
const DownloadIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const Spinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
  </div>
);

// Main App Component
function App() {
  const [cookieConsent, setCookieConsent] = useLocalStorage<'given' | 'denied' | 'pending'>('cookieConsent', 'pending');
  const [showConsentBanner, setShowConsentBanner] = useState(cookieConsent === 'pending');

  const [referencesUrl, setReferencesUrl] = useState('');
  const [stockUrl, setStockUrl] = useState('');

  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [stockFile, setStockFile] = useState<File | null>(null);
  const [lineCounts, setLineCounts] = useState<{ references: number | null; stock: number | null }>({ references: null, stock: null });

  const [mergedData, setMergedData] = useState<Reference[] | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorFilePreview, setErrorFilePreview] = useState<string | null>(null);
  
  const [userIp, setUserIp] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('EUR');

  const [filterQuery, setFilterQuery] = useState('');
  const [sortConfig, setSortConfig] = useLocalStorage<SortConfig>('sortConfig', { key: 'asin', direction: 'asc' });
  const [initialLoadTriggered, setInitialLoadTriggered] = useState(false);

  const processAndDisplayReferences = useCallback((refsContent: string) => {
    setStatus('loading');
    setError(null);
    setErrorFilePreview(null);
    setMergedData(null);
    setImportStats(null);

    try {
        const { delimiter, lines: refLines } = detectDelimiterAndSplit(refsContent);

        if (refLines.length === 0) {
            throw new Error("El archivo de referencias está vacío.");
        }

        const firstLine = refLines[0];
        const headerCells = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));

        const headerMappings: { [key: string]: keyof Reference } = {
            'asin': 'asin',
            'sku amz': 'amazonSku',
            'sku amazon': 'amazonSku',
            'sku': 'sku',
            'producto': 'productName',
            'nombre del producto': 'productName',
        };

        const defaultColumnOrder: (keyof Reference)[] = ['amazonSku', 'sku', 'asin', 'productName'];
        let columnMap: { [key in keyof Reference]?: number } = {};
        let dataRows = refLines;

        const isHeader = headerCells.some(h => headerMappings[h]);

        if (isHeader) {
            dataRows = refLines.slice(1);
            headerCells.forEach((header, index) => {
                const key = headerMappings[header];
                if (key) {
                    columnMap[key] = index;
                }
            });
        } else {
            defaultColumnOrder.forEach((key, index) => {
                columnMap[key] = index;
            });
        }

        const getColumn = (row: string[], key: keyof Reference): string | undefined => {
            const index = columnMap[key];
            return (index !== undefined) ? row[index] : undefined;
        };

        const referencesData: Reference[] = dataRows
            .map(row => row.split(delimiter).map(cell => cell.trim().replace(/"/g, '')))
            .filter(row => row.length >= 2 && row.some(cell => cell !== '')) // require at least 2 columns
            .map(row => ({
                amazonSku: getColumn(row, 'amazonSku') || '',
                sku: getColumn(row, 'sku') || '',
                asin: getColumn(row, 'asin') || '',
                productName: getColumn(row, 'productName') || '',
                stock: 0,
            }));

        if (referencesData.length === 0) {
            throw new Error("El archivo de referencias no contiene datos válidos.");
        }

        setMergedData(referencesData);
        setStatus('idle');
    } catch (e: any) {
        const preview = refsContent.split(/\r?\n/).slice(0, 3).join('\n');
        setErrorFilePreview(preview);
        setError(e.message || 'Error al procesar el archivo de referencias.');
        setStatus('error');
    }
  }, []);

  // Persist URLs to localStorage when they change and consent is given
  useEffect(() => {
    if (cookieConsent === 'given') {
      localStorage.setItem('referencesUrl', JSON.stringify(referencesUrl));
    }
  }, [referencesUrl, cookieConsent]);

  useEffect(() => {
    if (cookieConsent === 'given') {
      localStorage.setItem('stockUrl', JSON.stringify(stockUrl));
    }
  }, [stockUrl, cookieConsent]);
  
  // Effect to set default URLs and auto-process them on initial load
  useEffect(() => {
    if (cookieConsent === 'pending' || initialLoadTriggered) {
      return;
    }

    const initializeAndProcessDefaults = async () => {
      setInitialLoadTriggered(true);

      const getInitialUrl = (storageKey: 'referencesUrl' | 'stockUrl', defaultValue: string): string => {
        if (cookieConsent === 'given') {
          const savedUrl = localStorage.getItem(storageKey);
          const parsedUrl = savedUrl ? JSON.parse(savedUrl) : '';
          return parsedUrl || defaultValue;
        }
        // Handle denied state
        const currentUrl = storageKey === 'referencesUrl' ? referencesUrl : stockUrl;
        return currentUrl || defaultValue;
      };
      
      const initialRefsUrl = getInitialUrl('referencesUrl', 'https://docs.google.com/spreadsheets/d/1VNgvpORT85eG6wDO8O1yJZEl6cb0LVabaUqwU0t_Nbc/edit?usp=sharing');
      const initialStockUrl = getInitialUrl('stockUrl', 'https://gestion.ecomercium.com/stocks/Stock.csv');
      
      setReferencesUrl(initialRefsUrl);
      setStockUrl(initialStockUrl);

      if (referenceFile || mergedData) return;

      try {
        const refsContent = await fetchContent(null, initialRefsUrl);
        setLineCounts(prev => ({ ...prev, references: refsContent.trim().split(/\r?\n/).filter(Boolean).length }));
        processAndDisplayReferences(refsContent); 
      } catch (e: any) {
        console.error("Error auto-loading reference file:", e.message);
        setError("No se pudo cargar el archivo de referencias de ejemplo. Comprueba tu conexión.");
        setStatus('error');
      }

      try {
        const stockContent = await fetchContent(null, initialStockUrl);
        setLineCounts(prev => ({ ...prev, stock: stockContent.trim().split(/\r?\n/).filter(Boolean).length }));
      } catch (e: any) {
        console.error("Error auto-loading stock file:", e.message);
      }
    };
    
    initializeAndProcessDefaults();
  }, [cookieConsent, initialLoadTriggered, mergedData, referenceFile, processAndDisplayReferences, referencesUrl, stockUrl]);


  const handleReferencesUrlChange = (url: string) => {
    if (url.trim().toUpperCase() === 'OK') {
        setReferencesUrl('https://docs.google.com/spreadsheets/d/1VNgvpORT85eG6wDO8O1yJZEl6cb0LVabaUqwU0t_Nbc/edit?usp=sharing');
    } else {
        setReferencesUrl(url);
    }
  };

  const handleStockUrlChange = (url: string) => {
    if (url.trim().toUpperCase() === 'OK') {
        setStockUrl('https://gestion.ecomercium.com/stocks/Stock.csv');
    } else {
        setStockUrl(url);
    }
  };


  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) throw new Error('Failed to fetch IP');
        const data = await response.json();
        setUserIp(data.ip);
      } catch (error) {
        console.error('Failed to fetch IP address:', error);
        setUserIp('N/A');
      }
    };
    fetchIp();
  }, []);

  const handleAcceptCookies = () => {
    setCookieConsent('given');
    setShowConsentBanner(false);
  };
  
  const handleDeclineCookies = () => {
    setCookieConsent('denied');
    setShowConsentBanner(false);
    window.localStorage.removeItem('referencesUrl');
    window.localStorage.removeItem('stockUrl');
    setReferencesUrl('');
    setStockUrl('');
  };

  const handleManageCookies = () => {
    setShowConsentBanner(true);
  };


  const handleProcess = useCallback(async () => {
    if (!mergedData || mergedData.length === 0) {
        setError("Primero debes cargar un archivo de referencias válido.");
        setStatus('error');
        return;
    }

    setStatus('loading');
    setError(null);
    setErrorFilePreview(null);
    setImportStats(null);
    
    const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w-]+(?:\.[\w-]+)*(?:\/[\w-./?%&=]*)?$/i;
    if (stockUrl && !stockFile && !URL_REGEX.test(stockUrl)) {
      setError("La URL del archivo de stock no es válida. Asegúrate de que sea una URL accesible.");
      setStatus('error');
      return;
    }

    let stockContent = '';
    try {
      stockContent = await fetchContent(stockFile, stockUrl);
      if (stockUrl && !stockFile) {
        setLineCounts(prev => ({ ...prev, stock: stockContent.trim().split(/\r?\n/).length }));
      }
      
      const { delimiter, lines: stockLines } = detectDelimiterAndSplit(stockContent);
      if (stockLines.length <= 1) throw new Error("El archivo de stock está vacío o solo contiene cabecera.");

      const stockDataToProcess = stockLines
        .slice(1)
        .map(row => row.split(delimiter).map(cell => cell.trim()))
        .filter(row => row.length === 5 && row.some(cell => cell !== ''));
        
      if (stockDataToProcess.length === 0) throw new Error("El archivo de stock no tiene datos válidos.");

      const stockMap = new Map<string, number>();
      stockDataToProcess.forEach(row => {
        const sku = row[2];
        const stockString = row[3];
        if (sku && stockString.toUpperCase() !== '#N/A') {
            const stockValue = parseInt(stockString, 10);
            if (!isNaN(stockValue)) {
                stockMap.set(sku, stockValue);
            }
        }
      });

      let matchesFound = 0;
      const updatedData = mergedData.map(reference => {
        if (stockMap.has(reference.sku)) {
          matchesFound++;
          return { ...reference, stock: stockMap.get(reference.sku)! };
        }
        return reference; 
      });
      
      const processedReferences = updatedData.filter(ref => ref.stock > 0).length;
      const referencesWithZeroStock = updatedData.filter(ref => ref.stock === 0).length;
      const naValuesFound = updatedData.filter(ref => ref.sku.toUpperCase() === '#N/A').length;

      setImportStats({
        totalReferences: updatedData.length,
        totalStockRecords: stockLines.slice(1).length,
        matchesFound,
        processedReferences,
        referencesWithZeroStock,
        naValuesFound,
      });

      setMergedData(updatedData);
      setStatus('success');

    } catch (e: any) {
        if (stockContent) {
            const preview = stockContent.split(/\r?\n/).slice(0, 3).join('\n');
            setErrorFilePreview(preview);
        }
        setError(e.message);
        setStatus('error');
    }

  }, [mergedData, stockFile, stockUrl]);


  const handleFileChange = (
    file: File | null,
    setFile: (f: File | null) => void,
    countType: 'references' | 'stock'
  ) => {
    setFile(file);
    if (!file) {
      setLineCounts(prev => ({ ...prev, [countType]: null }));
      if (countType === 'references') setMergedData(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const lines = text.trim().split(/\r?\n/).length;
        setLineCounts(prev => ({ ...prev, [countType]: lines }));
        if (countType === 'references') {
            processAndDisplayReferences(text); 
        }
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo local. Por favor, comprueba la integridad del archivo o intenta con uno diferente.');
      setStatus('error');
      setLineCounts(prev => ({ ...prev, [countType]: null }));
    };
    reader.readAsText(file);
  };

  const handleReferencesUrlBlur = useCallback(async () => {
    if (!referencesUrl) {
      setLineCounts(prev => ({ ...prev, references: null }));
      setMergedData(null);
      return;
    }
    const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w-]+(?:\.[\w-]+)*(?:\/[\w-./?%&=]*)?$/i;
    if (!URL_REGEX.test(referencesUrl)) {
        setError('La URL del archivo de referencias no es válida. Asegúrate de que sea una URL accesible.');
        setStatus('error');
        return;
    }
  
    try {
      const content = await fetchContent(null, referencesUrl);
      setLineCounts(prev => ({ ...prev, references: content.trim().split(/\r?\n/).length }));
      processAndDisplayReferences(content);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, [referencesUrl, processAndDisplayReferences]);
  
  const handleStockUrlBlur = useCallback(async () => {
    if (!stockUrl) {
      setLineCounts(prev => ({ ...prev, stock: null }));
      return;
    }
    const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w-]+(?:\.[\w-]+)*(?:\/[\w-./?%&=]*)?$/i;
    if (!URL_REGEX.test(stockUrl)) {
        setError('La URL del archivo de stock no es válida. Asegúrate de que sea una URL accesible.');
        setStatus('error');
        return;
    }
    
    setError(null);
    if(status !== 'loading') setStatus('idle');

    try {
      const content = await fetchContent(null, stockUrl);
      setLineCounts(prev => ({ ...prev, stock: content.trim().split(/\r?\n/).length }));
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, [stockUrl, status]);

  const handleReload = async (type: 'references' | 'stock') => {
    if (type === 'references') {
        if (referenceFile) {
            handleFileChange(referenceFile, setReferenceFile, 'references');
        } else if (referencesUrl) {
            await handleReferencesUrlBlur();
        }
    } else if (type === 'stock') {
        if (stockFile) {
             handleFileChange(stockFile, setStockFile, 'stock'); // Re-read local file
        } else if(stockUrl) {
            await handleStockUrlBlur(); // Re-fetch URL
        }
        // Stock reload does not automatically trigger process, user must click button.
    }
  };


  const handleDownloadForAmazon = () => {
    if (!mergedData) return;

    const amazonData = mergedData.filter(item => 
      item.amazonSku && item.amazonSku.trim() !== ''
    );

    if (amazonData.length === 0) {
      alert("No hay datos con un SKU de Amazon válido para exportar.");
      return;
    }

    const header = 'sku,quantity\n';
    const csvContent = amazonData
      .map(item => `${item.amazonSku},${item.stock}`)
      .join('\n');
    
    const csvData = header + csvContent;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'amazon_stock_update.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSort = (key: SortableKeys) => {
    const newConfig = {
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    } as SortConfig;
    setSortConfig(newConfig);
  };

  const processedData = useMemo(() => {
    if (!mergedData) return [];
    let data = [...mergedData];

    // Filtering
    if (filterQuery) {
        const lowercasedQuery = filterQuery.toLowerCase();
        data = data.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowercasedQuery)
            )
        );
    }

    // Sorting
    if (sortConfig.key) {
        data.sort((a, b) => {
            const valA = a[sortConfig.key!];
            const valB = b[sortConfig.key!];
            
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return data;
  }, [mergedData, filterQuery, sortConfig]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <div className="flex-grow w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
            <header className="mb-6 text-center">
              <h1 className="text-4xl font-bold text-gray-800">
                Stock<span className="text-red-600">IA</span>
              </h1>
              <p className="mt-2 text-lg text-gray-500">Cruza tus referencias con el stock de tu proveedor.</p>
              <div className="mt-4 flex justify-center items-center gap-2 text-sm text-green-700 bg-green-100 border border-green-200 rounded-full px-4 py-2 max-w-md mx-auto">
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>
                      <strong>100% Privado:</strong> Tus archivos nunca salen de tu equipo.
                  </span>
              </div>
            </header>

            <main>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <DataSourceCard
                title="Archivo de Referencias"
                description="Campos: SKU Amazon, SKU, ASIN, [Producto]. Cabecera opcional. Acepta URLs de Google Sheets. Delimitador: ',' o ';' ."
                url={referencesUrl}
                onUrlChange={handleReferencesUrlChange}
                onFileChange={(file) => handleFileChange(file, setReferenceFile, 'references')}
                onUrlBlur={handleReferencesUrlBlur}
                onReload={() => handleReload('references')}
                file={referenceFile}
                lineCount={lineCounts.references}
                />
                <DataSourceCard
                title="Archivo de Stock del Proveedor"
                description="Campos: Almacen, Año, SKU, Stock, Fecha. Acepta URLs de Google Sheets. Delimitador: ',' o ';' ."
                url={stockUrl}
                onUrlChange={handleStockUrlChange}
                onFileChange={(file) => handleFileChange(file, setStockFile, 'stock')}
                onUrlBlur={handleStockUrlBlur}
                onReload={() => handleReload('stock')}
                file={stockFile}
                lineCount={lineCounts.stock}
                />
            </div>

            <div className="flex justify-center items-center gap-4 mb-6">
                <button
                onClick={handleProcess}
                disabled={status === 'loading'}
                className="w-full md:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                {status === 'loading' ? 'Procesando...' : 'Cruzar Información'}
                </button>
                {status === 'success' && (
                    <button
                        onClick={handleDownloadForAmazon}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors shadow-lg hover:shadow-xl"
                    >
                        <DownloadIcon />
                        Descargar
                    </button>
                )}
            </div>
            
            {status === 'success' && importStats && <StatisticsPanel stats={importStats} />}
            
            <div className="bg-white p-6 rounded-lg shadow-md min-h-[10rem]">
                {status === 'loading' && <Spinner />}
                {status === 'error' && (
                <div className="text-center">
                    <p className="text-red-600 font-semibold mb-4">{error}</p>
                    {errorFilePreview && (
                    <div className="p-4 bg-gray-100 rounded-md text-left">
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Previsualización del archivo (primeras 3 líneas):</h4>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                        {errorFilePreview}
                        </pre>
                    </div>
                    )}
                </div>
                )}
                {mergedData && (
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                        <h3 className="text-xl font-bold text-gray-800">
                           {status === 'success' ? 'Resultados del Cruce' : 'Datos de Referencias Cargados'}
                        </h3>
                        <input
                            type="text"
                            placeholder="Filtrar resultados..."
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 transition"
                        />
                    </div>
                    <DataTable data={processedData} onSort={handleSort} sortConfig={sortConfig} />
                </div>
                )}
                {status === 'idle' && !mergedData && (
                   <p className="text-center text-gray-500">Selecciona un archivo de Referencias para comenzar.</p>
                )}
            </div>
            </main>
        </div>
      </div>
      <Footer
        tokenCount={0}
        totalCostUSD={0}
        userIp={userIp}
        currency={currency}
        onManageCookies={handleManageCookies}
      />
      {showConsentBanner && (
        <CookieConsent
          onAccept={handleAcceptCookies}
          onDecline={handleDeclineCookies}
        />
      )}
    </div>
  );
}

export default App;