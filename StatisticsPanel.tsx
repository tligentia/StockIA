import React from 'react';
import type { ImportStats } from './types';

interface StatCardProps {
  title: string;
  value: number | string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => (
  <div className="p-3 bg-white rounded-md shadow-sm">
    <p className="text-sm text-gray-500 truncate">{title}</p>
    <p className="text-2xl font-bold text-red-600">{value}</p>
  </div>
);

interface StatisticsPanelProps {
  stats: ImportStats;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ stats }) => (
  <div className="my-6 p-4 bg-gray-100 rounded-lg shadow-inner">
    <h3 className="text-lg font-bold text-gray-800 mb-3 text-center md:text-left">Estadísticas de la Importación</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
      <StatCard title="Referencias Totales" value={stats.totalReferences} />
      <StatCard title="Registros de Stock" value={stats.totalStockRecords} />
      <StatCard title="Coincidencias" value={stats.matchesFound} />
      <StatCard title="Refs Procesadas" value={stats.processedReferences} />
      <StatCard title="Refs Stock = 0" value={stats.referencesWithZeroStock} />
      <StatCard title="Valores #N/A" value={stats.naValuesFound} />
    </div>
  </div>
);