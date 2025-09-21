import React from 'react';
import type { Reference, SortableKeys, SortConfig } from './types';

interface DataTableProps {
  data: Reference[];
  onSort: (key: SortableKeys) => void;
  sortConfig: SortConfig;
}

export const DataTable: React.FC<DataTableProps> = ({ data, onSort, sortConfig }) => {
  const SortableHeader: React.FC<{ title: string; field: SortableKeys }> = ({ title, field }) => {
    const isSorted = sortConfig.key === field;
    const directionIcon = sortConfig.direction === 'asc' ? '▲' : '▼';
    return (
      <th scope="col" onClick={() => onSort(field)} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors">
        <div className="flex items-center">
            <span>{title}</span>
            {isSorted && <span className="ml-2 text-red-600">{directionIcon}</span>}
        </div>
      </th>
    );
  };
  
  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(10 * 3.5rem + 2.5rem)' }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">#</th>
              <SortableHeader title="ASIN" field="asin" />
              <SortableHeader title="SKU AMZ" field="amazonSku" />
              <SortableHeader title="SKU" field="sku" />
              <SortableHeader title="Stock" field="stock" />
              <SortableHeader title="Producto" field="productName" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={`${item.amazonSku}-${item.sku}-${index}`} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.asin}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.amazonSku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.sku}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${item.stock > 0 ? 'text-gray-800' : 'text-red-500'}`}>{item.stock}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 truncate" style={{maxWidth: '150px'}} title={item.productName}>{item.productName || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
