import React, { useState, useMemo, useEffect } from 'react';
import { Raffle, Ticket, TicketStatus } from '../types';
import CountdownTimer from './CountdownTimer';
import { GiftIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, QrCodeIcon, ShareIcon, WhatsAppIcon, FacebookIcon, XSocialIcon, ClipboardIcon } from './icons';

// --- Helper Functions & Constants ---
const RESERVATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const getStatusClasses = (status: TicketStatus, isSelected: boolean) => {
    if (isSelected) return 'bg-blue-500 text-white border-blue-700 ring-2 ring-blue-300';
    switch (status) {
        case TicketStatus.PAID: return 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400';
        case TicketStatus.RESERVED: return 'bg-yellow-400 text-yellow-800 cursor-not-allowed border-yellow-500';
        case TicketStatus.AVAILABLE: return 'bg-green-500 text-white hover:bg-green-600 border-green-700';
        default: return 'bg-gray-200';
    }
};

// --- PIX QR Code Generator ---
/**
 * Calculates CRC16/CCITT-FALSE checksum.
 * @param payload The string to calculate the checksum for.
 * @returns A 4-character hexadecimal string representing the checksum.
 */
const crc16 = (payload: string): string => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
        }
    }
    return ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
};

/**
 * Formats a value for the PIX payload with ID and length.
 * @param id The ID of the field.
 * @param value The value of the field.
 * @returns A formatted string "IDLLValue".
 */
const formatValue = (id: string, value: string): string => {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
};

/**
 * Generates a valid PIX QR Code payload string (BR Code).
 * @param pixKey The PIX key (CPF, CNPJ, email, phone, or random).
 * @param amount The transaction amount.
 * @param merchantName The name of the merchant/receiver (up to 25 chars).
 * @param merchantCity The city of the merchant/receiver (up to 15 chars).
 * @param txid The transaction ID (defaults to '***' for static QR codes).
 * @returns A complete and valid BR Code string.
 */
const generatePixPayload = (pixKey: string, amount: number, merchantName: string, merchantCity: string, txid: string = '***'): string => {
    // Normalize and truncate names according to spec, removing special characters
    const sanitizedMerchantName = merchantName.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, '');
    const sanitizedMerchantCity = merchantCity.substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, '');

    const payload = [
        formatValue('00', '01'), // Payload Format Indicator
        formatValue('26', // Merchant Account Information
            formatValue('00', 'br.gov.bcb.pix') +
            formatValue('01', pixKey)
        ),
        formatValue('52', '0000'), // Merchant Category Code
        formatValue('53', '986'), // Transaction Currency (BRL)
        formatValue('54', amount.toFixed(2)), // Transaction Amount
        formatValue('58', 'BR'), // Country Code
        formatValue('59', sanitizedMerchantName), // Merchant Name
        formatValue('60', sanitizedMerchantCity), // Merchant City
        formatValue('62', // Additional Data Field
            formatValue('05', txid)
        )
    ].join('');

    const payloadWithCrcPrefix = payload + '6304';
    const crc = crc16(payloadWithCrcPrefix);

    return payloadWithCrcPrefix + crc;
};


// --- ShareMenu Component (for desktop fallback) ---
interface ShareMenuProps {
    url: string;
    title: string;
    onClose: () => void;
}

const ShareMenu: React.FC<ShareMenuProps> = ({ url, title, onClose }) => {
    const [copied, setCopied] = useState(false);

    const shareOptions = [
        { 
            name: 'WhatsApp', 
            icon: <WhatsAppIcon className="w-6 h-6 text-green-500" />, 
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + '\n' + url)}` 
        },
        { 
            name: 'Facebook', 
            icon: <FacebookIcon className="w-6 h-6 text-blue-600" />, 
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` 
        },
        { 
            name: 'X / Twitter', 
            icon: <XSocialIcon className="w-6 h-6 text-gray-800" />, 
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` 
        },
    ];

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
            onClose();
        }, 1500);
    };

    return (
        <div className="absolute top-14 right-4 bg-white rounded-lg shadow-xl z-50 p-2 border w-52">
            <ul className="space-y-1">
                {shareOptions.map(option => (
                    <li key={option.name}>
                        <a 
                            href={option.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors w-full"
                            onClick={onClose}
                        >
                            {option.icon}
                            <span className="text-sm font-medium">{option.name}</span>
                        </a>
                    </li>
                ))}
                <li>
                    <button 
                        onClick={handleCopy} 
                        className="flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors w-full"
                    >
                        <ClipboardIcon className="w-6 h-6 text-gray-500" />
                        <span className="text-sm font-medium">{copied ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>
                </li>
            </ul>
        </div>
    );
};


// --- PaymentModal Component ---
interface PaymentModalProps {
    raffle: Raffle;
    selectedNumbers: number[];
    onClose: () => void;
    onConfirmReservation: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ raffle, selectedNumbers, onClose, onConfirmReservation }) => {
    const total = raffle.ticketPrice * selectedNumbers.length;
    
    const pixPayload = useMemo(() => generatePixPayload(
        raffle.pixKey,
        total,
        raffle.name, // Merchant Name (will be sanitized)
        'CUIABA'     // Merchant City
    ), [raffle.pixKey, total, raffle.name]);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixPayload)}`;
    
    const [pixKeyCopied, setPixKeyCopied] = useState(false);
    const [pixPayloadCopied, setPixPayloadCopied] = useState(false);

    const handleCopyPixKey = () => {
        navigator.clipboard.writeText(raffle.pixKey);
        setPixKeyCopied(true);
        setTimeout(() => setPixKeyCopied(false), 2000);
    };

    const handleCopyPixPayload = () => {
        navigator.clipboard.writeText(pixPayload);
        setPixPayloadCopied(true);
        setTimeout(() => setPixPayloadCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md relative text-center">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
                    <XCircleIcon className="w-8 h-8" />
                </button>
                <h2 className="text-2xl font-bold mb-4 text-primary">Pagamento via PIX</h2>
                <p className="mb-2">Você selecionou <strong>{selectedNumbers.length}</strong> número(s):</p>
                <div className="flex flex-wrap justify-center gap-2 mb-4 max-h-20 overflow-y-auto">
                    {selectedNumbers.map(n => <span key={n} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">{String(n).padStart(3, '0')}</span>)}
                </div>
                <p className="text-3xl font-bold mb-4">Total: R$ {total.toFixed(2)}</p>
                
                <div className="flex justify-center my-4">
                    <img src={qrCodeUrl} alt="PIX QR Code" className="border-4 border-primary rounded-lg" />
                </div>
                <p className="text-gray-600 mb-4">Aponte a câmera para o QR Code ou use as opções abaixo.</p>
                
                <div className="space-y-3">
                    <div className="text-left text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
                        <p className="font-semibold mb-1">Chave PIX:</p>
                        <div className="relative flex items-center">
                            <input type="text" readOnly value={raffle.pixKey} className="w-full bg-transparent font-mono text-sm pr-16"/>
                            <button onClick={handleCopyPixKey} className="absolute right-0 top-1/2 -translate-y-1/2 bg-secondary text-white px-3 py-1 rounded-md text-xs font-semibold">
                                {pixKeyCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    <div className="text-left text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
                        <p className="font-semibold mb-1">PIX Copia e Cola:</p>
                        <div className="relative flex items-center">
                            <textarea readOnly value={pixPayload} rows={3} className="w-full bg-transparent font-mono text-xs pr-16 resize-none" />
                            <button onClick={handleCopyPixPayload} className="absolute right-0 top-1/2 -translate-y-1/2 bg-secondary text-white px-3 py-1 rounded-md text-xs font-semibold">
                                {pixPayloadCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>
                </div>

                <button onClick={onConfirmReservation} className="w-full bg-success text-white mt-4 p-3 rounded-lg font-bold hover:bg-green-700 transition-colors">
                    Já fiz o pagamento! (Reservar)
                </button>
                <p className="text-xs text-gray-500 mt-2">Seu número ficará reservado por 10 minutos para confirmação do pagamento.</p>
            </div>
        </div>
    );
};

// --- RafflePage Component ---
interface RafflePageProps {
  raffle: Raffle;
  onUpdateRaffle: (updatedRaffle: Raffle) => void;
  isDeepLinkView?: boolean;
  onNavigateHome?: () => void;
}

export const RafflePage: React.FC<RafflePageProps> = ({ raffle, onUpdateRaffle, isDeepLinkView, onNavigateHome }) => {
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

    const handleShare = async () => {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('raffle', raffle.id);
        const shareUrl = url.toString();
        
        const shareData = {
            title: raffle.name,
            text: `Participe da rifa "${raffle.name}" e concorra a: ${raffle.prize}!`,
            url: shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Erro ao compartilhar:', error);
            }
        } else {
            // Fallback for desktop
            setIsShareMenuOpen(prev => !prev);
        }
    };

    // Effect to clean up expired reservations
    useEffect(() => {
        const interval = setInterval(() => {
            let needsUpdate = false;
            const now = Date.now();
            const updatedTickets = raffle.tickets.map(ticket => {
                if (ticket.status === TicketStatus.RESERVED && ticket.reservedAt && (now - ticket.reservedAt > RESERVATION_TIMEOUT_MS)) {
                    needsUpdate = true;
                    return { ...ticket, status: TicketStatus.AVAILABLE, reservedAt: undefined };
                }
                return ticket;
            });

            if (needsUpdate) {
                onUpdateRaffle({ ...raffle, tickets: updatedTickets });
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [raffle, onUpdateRaffle]);


    const handleToggleNumber = (number: number) => {
        const ticket = raffle.tickets.find(t => t.number === number);
        if (ticket?.status !== TicketStatus.AVAILABLE) return;

        setSelectedNumbers(prev =>
            prev.includes(number)
                ? prev.filter(n => n !== number)
                : [...prev, number]
        );
    };

    const handleConfirmReservation = () => {
        const now = Date.now();
        const updatedTickets = raffle.tickets.map(ticket =>
            selectedNumbers.includes(ticket.number)
                ? { ...ticket, status: TicketStatus.RESERVED, reservedAt: now }
                : ticket
        );
        onUpdateRaffle({ ...raffle, tickets: updatedTickets });
        setSelectedNumbers([]);
        setPaymentModalOpen(false);
    }
    
    const stats = useMemo(() => {
        const paid = raffle.tickets.filter(t => t.status === TicketStatus.PAID).length;
        const reserved = raffle.tickets.filter(t => t.status === TicketStatus.RESERVED).length;
        const available = raffle.tickets.filter(t => t.status === TicketStatus.AVAILABLE).length;
        return { paid, reserved, available, total: raffle.totalTickets };
    }, [raffle.tickets, raffle.totalTickets]);

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            {isDeepLinkView && (
                <div className="mb-4 text-center">
                    <button onClick={onNavigateHome} className="text-primary font-semibold hover:underline">
                        &larr; Ver todas as rifas
                    </button>
                </div>
            )}
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="p-6 md:p-8 bg-primary text-white text-center relative">
                    <h1 className="text-4xl font-bold">{raffle.name}</h1>
                    <p className="text-lg mt-2 text-accent">{raffle.description}</p>
                    <button
                        onClick={handleShare}
                        className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/40 transition-colors"
                        aria-label="Compartilhar Rifa"
                    >
                         <ShareIcon className="w-6 h-6" />
                    </button>
                    {isShareMenuOpen && (
                        <ShareMenu 
                            url={(() => {
                                const url = new URL(window.location.href);
                                url.search = '';
                                url.hash = '';
                                url.searchParams.set('raffle', raffle.id);
                                return url.toString();
                            })()}
                            title={`Participe da rifa "${raffle.name}" e concorra a: ${raffle.prize}!`}
                            onClose={() => setIsShareMenuOpen(false)}
                        />
                    )}
                </div>

                <div className="p-6">
                    {raffle.imageUrl && (
                        <div className="mb-6 flex justify-center">
                            <img src={raffle.imageUrl} alt={raffle.prize} className="rounded-lg shadow-lg max-w-full max-h-96 object-contain" />
                        </div>
                    )}
                    <div className="text-center mb-6">
                        <p className="text-xl text-gray-700">Prêmio:</p>
                        <p className="text-3xl font-bold text-secondary">{raffle.prize}</p>
                    </div>

                    <CountdownTimer targetDate={raffle.drawDate} />

                    {raffle.winner && (
                         <div className="text-center p-4 bg-green-100 rounded-lg my-4 border border-green-300">
                            <p className="font-semibold text-green-800">Sorteio realizado!</p>
                            <p className="text-3xl font-bold text-success">🏆 Ganhador: Número {String(raffle.winner).padStart(3, '0')} 🏆</p>
                        </div>
                    )}
                    
                    <div className="my-6">
                        <div className="flex justify-center items-center gap-4 mb-2 text-sm text-gray-600">
                           <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-green-500"></span> Disponível</span>
                           <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-yellow-400"></span> Reservado</span>
                           <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-gray-300"></span> Comprado</span>
                           <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-blue-500"></span> Selecionado</span>
                        </div>
                         <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-2 p-4 bg-gray-100 rounded-lg max-h-96 overflow-y-auto">
                            {raffle.tickets.map(ticket => (
                                <button
                                    key={ticket.number}
                                    onClick={() => handleToggleNumber(ticket.number)}
                                    disabled={ticket.status !== TicketStatus.AVAILABLE}
                                    className={`w-full aspect-square text-sm font-bold rounded-md shadow-sm transition-all duration-200 border-b-4 ${getStatusClasses(ticket.status, selectedNumbers.includes(ticket.number))}`}
                                >
                                    {String(ticket.number).padStart(String(raffle.totalTickets).length, '0')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
             {selectedNumbers.length > 0 && (
                <div className="sticky bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-between items-center z-20">
                    <div>
                        <p className="font-semibold">{selectedNumbers.length} número(s) selecionado(s)</p>
                        <p className="text-xl font-bold text-primary">Total: R$ {(selectedNumbers.length * raffle.ticketPrice).toFixed(2)}</p>
                    </div>
                    <button onClick={() => setPaymentModalOpen(true)} className="bg-success text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6" />
                        Comprar Agora
                    </button>
                </div>
            )}
             {isPaymentModalOpen && (
                <PaymentModal 
                    raffle={raffle} 
                    selectedNumbers={selectedNumbers} 
                    onClose={() => setPaymentModalOpen(false)} 
                    onConfirmReservation={handleConfirmReservation}
                />
            )}
        </div>
    );
};

// --- RaffleCard Component ---
interface RaffleCardProps {
  raffle: Raffle;
  onSelect: () => void;
}

const RaffleCard: React.FC<RaffleCardProps> = ({ raffle, onSelect }) => {
    const paidTickets = useMemo(() => raffle.tickets.filter(t => t.status === TicketStatus.PAID).length, [raffle.tickets]);
    const progress = (paidTickets / raffle.totalTickets) * 100;
  
    return (
        <div onClick={onSelect} className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
            {raffle.imageUrl && (
                <img src={raffle.imageUrl} alt={raffle.name} className="w-full h-48 object-cover" />
            )}
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-primary truncate">{raffle.name}</h3>
                <div className="flex items-center text-gray-600 my-3">
                    <GiftIcon className="w-5 h-5 mr-2 text-secondary" />
                    <span className="font-semibold">{raffle.prize}</span>
                </div>
                 <div className="flex items-center text-gray-600 text-sm">
                    <CalendarIcon className="w-5 h-5 mr-2 text-secondary" />
                    <span>Sorteio: {new Date(raffle.drawDate).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex-grow">
                    <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                        <span>Progresso</span>
                        <span>{paidTickets} / {raffle.totalTickets}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-success h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <span className="inline-block bg-accent text-white text-lg font-bold px-6 py-2 rounded-full">
                        R$ {raffle.ticketPrice.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
};


// --- RaffleList Component ---
interface RaffleListProps {
  raffles: Raffle[];
  onSelectRaffle: (id: string) => void;
}

export const RaffleList: React.FC<RaffleListProps> = ({ raffles, onSelectRaffle }) => {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-center text-primary mb-8">Rifas Disponíveis</h1>
      {raffles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {raffles.map(raffle => (
                <RaffleCard key={raffle.id} raffle={raffle} onSelect={() => onSelectRaffle(raffle.id)} />
            ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-10">Nenhuma rifa disponível no momento.</p>
      )}
    </div>
  );
};