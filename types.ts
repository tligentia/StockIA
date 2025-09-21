export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface Reference {
  asin: string;
  amazonSku: string;
  sku: string;
  stock: number;
  productName?: string;
}

export type SortableKeys = keyof Reference;
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
    key: SortableKeys | null;
    direction: SortDirection;
}

export interface ImportStats {
  totalReferences: number;
  totalStockRecords: number;
  matchesFound: number;
  processedReferences: number;
  referencesWithZeroStock: number;
  naValuesFound: number;
}
