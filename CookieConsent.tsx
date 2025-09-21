import React, { useEffect } from 'react';

interface CookieConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAccept();
    }, 5000); // Auto-accept after 5 seconds

    return () => {
      clearTimeout(timer); // Clean up the timer if the component unmounts
    };
  }, [onAccept]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 text-white p-4 z-50 shadow-lg animate-slide-in-up">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-center sm:text-left">
          <p>
            <strong className="font-semibold">Aviso de Privacidad:</strong> Utilizamos el almacenamiento local (`localStorage`) para guardar las URLs de los archivos entre sesiones y mejorar tu experiencia.
          </p>
          <p className="mt-1 text-slate-300">
            <span className="font-bold text-red-400">Importante:</span> Tus archivos y datos nunca salen de tu equipo. Todo el proceso es 100% local.
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          <button onClick={onAccept} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors">
            Aceptar
          </button>
          <button onClick={onDecline} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-sm font-medium transition-colors">
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
