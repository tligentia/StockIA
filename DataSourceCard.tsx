import React from 'react';

// Icons used only by this component
const FileIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
  </svg>
);

const ReloadIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.181-3.183m-3.181-4.991-3.182-3.182a8.25 8.25 0 0 0-11.664 0l-3.181 3.182" />
    </svg>
);


interface DataSourceCardProps {
  title: string;
  description: string;
  url: string;
  onUrlChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onUrlBlur: () => void;
  onReload: () => void;
  lineCount: number | null;
}

export const DataSourceCard: React.FC<DataSourceCardProps> = ({ title, description, url, onUrlChange, file, onFileChange, onUrlBlur, onReload, lineCount }) => {
  const fileInputId = `file-input-${title.replace(/\s+/g, '-')}`;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-baseline">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            {lineCount !== null && lineCount > 0 && (
            <span className="ml-2 text-sm font-medium text-blue-600">
                ({lineCount} líneas)
            </span>
            )}
        </div>
        <button onClick={onReload} title="Forzar recarga del archivo" className="text-gray-400 hover:text-red-600 transition-colors">
            <ReloadIcon />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4 -mt-3 h-10">{description}</p>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <LinkIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onBlur={onUrlBlur}
          placeholder="O pega una URL aquí"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 transition"
        />
      </div>

      <div className="flex items-center justify-center my-4">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink mx-4 text-xs text-gray-400 font-semibold uppercase">O</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>
      
      <label htmlFor={fileInputId} className="cursor-pointer w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-red-500 hover:text-red-600 transition bg-gray-50 hover:bg-red-50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
        <span className="text-sm font-medium truncate">
          {file ? file.name : 'Seleccionar archivo local'}
        </span>
      </label>
      <input 
        id={fileInputId}
        type="file" 
        className="hidden"
        onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)}
      />
    </div>
  );
};
