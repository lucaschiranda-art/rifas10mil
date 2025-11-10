import React, { useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { Raffle } from '../types';
import { DownloadIcon, TicketIcon, XCircleIcon } from './icons';

interface ReceiptData {
    name: string;
    contact: string;
    selectedNumbers: number[];
    total: number;
}

interface ReceiptModalProps {
    raffle: Raffle;
    receiptData: ReceiptData;
    onClose: () => void;
}

const LoadingSpinner: React.FC<{className?: string}> = ({ className = 'w-5 h-5' }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ReceiptModal: React.FC<ReceiptModalProps> = ({ raffle, receiptData, onClose }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = () => {
        if (!receiptRef.current) return;
        setIsDownloading(true);
        htmlToImage.toPng(receiptRef.current, { 
            cacheBust: true, 
            backgroundColor: '#ffffff',
            pixelRatio: 2
        })
        .then((dataUrl) => {
            const link = document.createElement('a');
            link.download = `comprovante-rifa-${raffle.id}.png`;
            link.href = dataUrl;
            link.click();
        })
        .catch((err) => {
            console.error('oops, something went wrong!', err);
            alert('Não foi possível gerar a imagem do comprovante.');
        })
        .finally(() => {
            setIsDownloading(false);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-100 p-6 rounded-lg shadow-2xl w-full max-w-md relative max-h-screen overflow-y-auto">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">
                    <XCircleIcon className="w-8 h-8" />
                </button>
                
                <div ref={receiptRef} className="bg-white p-6 rounded-lg shadow-inner">
                    <div className="text-center border-b-2 border-dashed pb-4 mb-4">
                         <div className="flex items-center justify-center gap-2 text-primary">
                            <TicketIcon className="w-8 h-8" />
                            <h2 className="text-2xl font-bold">RifaFácil</h2>
                        </div>
                        <p className="text-lg font-semibold mt-2">Comprovante de Reserva</p>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="font-semibold text-gray-800">
                            <p className="text-xs text-gray-500">Rifa</p>
                            <p>{raffle.name}</p>
                        </div>
                        <div className="font-semibold text-gray-800">
                            <p className="text-xs text-gray-500">Prêmio</p>
                            <p>{raffle.prize}</p>
                        </div>
                        <hr className="my-2"/>
                        <div className="font-semibold text-gray-800">
                            <p className="text-xs text-gray-500">Nome do Participante</p>
                            <p>{receiptData.name}</p>
                        </div>
                         <div className="font-semibold text-gray-800">
                            <p className="text-xs text-gray-500">Contato</p>
                            <p>{receiptData.contact}</p>
                        </div>
                        <hr className="my-2"/>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Números Escolhidos ({receiptData.selectedNumbers.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {receiptData.selectedNumbers.map(n => (
                                    <span key={n} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">{String(n).padStart(3, '0')}</span>
                                ))}
                            </div>
                        </div>
                        <div className="pt-2 flex justify-between items-end">
                            <p className="text-gray-600">Valor Total</p>
                            <p className="text-xl font-bold text-primary">R$ {receiptData.total.toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t-2 border-dashed text-center">
                         <p className="bg-yellow-100 text-yellow-800 text-sm font-bold p-2 rounded-md">
                            STATUS: AGUARDANDO PAGAMENTO
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            Seus números estão reservados por <strong>10 minutos</strong>. A confirmação do pagamento será feita pelo administrador.
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Data da Reserva: {new Date().toLocaleString('pt-BR')}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 bg-success text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
                    >
                        {isDownloading ? <LoadingSpinner /> : <DownloadIcon className="w-5 h-5" />}
                        <span>{isDownloading ? 'Gerando...' : 'Baixar Comprovante'}</span>
                    </button>
                    <button 
                        onClick={onClose}
                        className="flex-1 bg-gray-500 text-white p-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
