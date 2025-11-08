import React, { useState, useMemo } from 'react';
import { Raffle, Ticket, TicketStatus } from '../types';
import { GiftIcon, TrashIcon, XCircleIcon, PencilIcon, ClipboardIcon, QrCodeIcon, DownloadIcon } from './icons';

interface RaffleFormProps {
  onSubmit: (raffle: Raffle) => void;
  onClose: () => void;
  initialRaffle?: Raffle;
}

const RaffleForm: React.FC<RaffleFormProps> = ({ onSubmit, onClose, initialRaffle }) => {
  const isEditMode = !!initialRaffle;

  const formatDateForInput = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      // The input type="datetime-local" needs format YYYY-MM-DDTHH:mm
      return new Date(isoDate).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  const [name, setName] = useState(initialRaffle?.name || '');
  const [description, setDescription] = useState(initialRaffle?.description || '');
  const [prize, setPrize] = useState(initialRaffle?.prize || '');
  const [ticketPrice, setTicketPrice] = useState(initialRaffle?.ticketPrice || 1);
  const [totalTickets, setTotalTickets] = useState(initialRaffle?.totalTickets || 100);
  const [drawDate, setDrawDate] = useState(formatDateForInput(initialRaffle?.drawDate));
  const [pixKey, setPixKey] = useState(initialRaffle?.pixKey || '');
  const [imagePreview, setImagePreview] = useState<string | null>(initialRaffle?.imageUrl || null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !prize || !ticketPrice || !totalTickets || !drawDate || !pixKey) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    if (isEditMode) {
        const updatedRaffle: Raffle = {
            ...initialRaffle,
            name,
            description,
            prize,
            imageUrl: imagePreview || undefined,
            ticketPrice,
            drawDate,
            pixKey,
        };
        onSubmit(updatedRaffle);
    } else {
        const tickets: Ticket[] = Array.from({ length: totalTickets }, (_, i) => ({
            number: i + 1,
            status: TicketStatus.AVAILABLE,
        }));
        const newRaffle: Raffle = {
            id: `raffle-${Date.now()}`,
            name,
            description,
            prize,
            imageUrl: imagePreview || undefined,
            ticketPrice,
            totalTickets,
            drawDate,
            pixKey,
            tickets,
            createdAt: Date.now(),
        };
        onSubmit(newRaffle);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-primary">{isEditMode ? 'Editar Rifa' : 'Criar Nova Rifa'}</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
            <XCircleIcon className="w-8 h-8" />
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Nome da Rifa" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" required/>
          <textarea placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded" />
          <input type="text" placeholder="Prêmio" value={prize} onChange={e => setPrize(e.target.value)} className="w-full p-2 border rounded" required/>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Prêmio</label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"/>
            {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 rounded-lg max-h-40 w-auto shadow-sm" />}
          </div>
          <input type="number" placeholder="Valor por Número (R$)" value={ticketPrice} onChange={e => setTicketPrice(Number(e.target.value))} className="w-full p-2 border rounded" min="0.01" step="0.01" required/>
          <input type="number" placeholder="Quantidade de Números" value={totalTickets} onChange={e => setTotalTickets(Number(e.target.value))} className="w-full p-2 border rounded disabled:bg-gray-200" min="1" required disabled={isEditMode}/>
          <input type="datetime-local" value={drawDate} onChange={e => setDrawDate(e.target.value)} className="w-full p-2 border rounded" required/>
          <input type="text" placeholder="Chave PIX" value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full p-2 border rounded" required/>
          <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-secondary transition-colors">
            {isEditMode ? 'Salvar Alterações' : 'Criar Rifa'}
          </button>
        </form>
      </div>
    </div>
  );
};


interface ShareModalProps {
    raffle: Raffle;
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ raffle, onClose }) => {
    const [linkCopied, setLinkCopied] = useState(false);
    
    const url = useMemo(() => {
        const newUrl = new URL(window.location.href);
        newUrl.search = '';
        newUrl.hash = '';
        newUrl.searchParams.set('raffle', raffle.id);
        return newUrl.toString();
    }, [raffle.id]);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
    };
    
    const handleDownloadQRCode = async () => {
        try {
            const response = await fetch(qrCodeUrl);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `qrcode-rifa-${raffle.id}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Failed to download QR Code:', error);
            alert('Não foi possível baixar o QR Code.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md relative text-center">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
                    <XCircleIcon className="w-8 h-8" />
                </button>
                <h2 className="text-2xl font-bold mb-2 text-primary">Divulgar Rifa</h2>
                <p className="text-gray-600 mb-4">{raffle.name}</p>
                
                <div className="flex justify-center my-4 p-2 border-4 border-primary rounded-lg inline-block">
                    <img src={qrCodeUrl} alt="Raffle QR Code" />
                </div>
                
                <p className="text-sm text-gray-600 mb-2">Link de divulgação:</p>
                <div className="relative mb-4">
                    <input type="text" readOnly value={url} className="w-full bg-gray-100 p-3 rounded-lg text-center border-2 border-gray-300 text-sm"/>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={handleCopyLink} className="flex-1 flex items-center justify-center gap-2 bg-secondary text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        <ClipboardIcon className="w-5 h-5" />
                        <span>{linkCopied ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>
                     <button onClick={handleDownloadQRCode} className="flex-1 flex items-center justify-center gap-2 bg-success text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                        <DownloadIcon className="w-5 h-5" />
                        <span>Baixar QR Code</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ManageRaffleProps {
    raffle: Raffle;
    onUpdateRaffle: (updatedRaffle: Raffle) => void;
    onDeleteRaffle: (raffleId: string) => void;
}

const ManageRaffle: React.FC<ManageRaffleProps> = ({ raffle, onUpdateRaffle, onDeleteRaffle }) => {
    const [winnerNumber, setWinnerNumber] = useState<number | ''>('');
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleConfirmPayment = (ticketNumber: number) => {
        const updatedTickets = raffle.tickets.map(t =>
            t.number === ticketNumber ? { ...t, status: TicketStatus.PAID } : t
        );
        onUpdateRaffle({ ...raffle, tickets: updatedTickets });
    };

    const handleSetWinner = () => {
        if(winnerNumber === '' || winnerNumber < 1 || winnerNumber > raffle.totalTickets) {
            alert('Por favor, insira um número de ganhador válido.');
            return;
        }
        onUpdateRaffle({ ...raffle, winner: winnerNumber });
    }

    const handleDelete = () => {
        onDeleteRaffle(raffle.id);
        setIsConfirmingDelete(false);
    }
    
    const handleUpdateRaffle = (updatedRaffle: Raffle) => {
        onUpdateRaffle(updatedRaffle);
        setIsEditing(false);
    }

    const reservedTickets = raffle.tickets.filter(t => t.status === TicketStatus.RESERVED);
    const paidTickets = raffle.tickets.filter(t => t.status === TicketStatus.PAID);

    return (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50 shadow-sm relative">
             <div className="flex justify-between items-start mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold text-secondary">{raffle.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                     <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1 text-sm rounded-md hover:bg-green-700 transition-colors"
                        aria-label={`Divulgar rifa ${raffle.name}`}
                    >
                        <QrCodeIcon className="w-4 h-4" />
                        <span>Divulgar</span>
                    </button>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 bg-secondary text-white px-3 py-1 text-sm rounded-md hover:bg-blue-700 transition-colors"
                        aria-label={`Editar rifa ${raffle.name}`}
                    >
                        <PencilIcon className="w-4 h-4" />
                        <span>Editar</span>
                    </button>
                    <button
                        onClick={() => setIsConfirmingDelete(true)}
                        className="flex items-center gap-1.5 bg-danger text-white px-3 py-1 text-sm rounded-md hover:bg-red-700 transition-colors"
                        aria-label={`Excluir rifa ${raffle.name}`}
                    >
                        <TrashIcon className="w-4 h-4" />
                        <span>Excluir</span>
                    </button>
                </div>
            </div>
            
            {isEditing && (
                <RaffleForm 
                    initialRaffle={raffle} 
                    onSubmit={handleUpdateRaffle} 
                    onClose={() => setIsEditing(false)} 
                />
            )}

            {isShareModalOpen && (
                <ShareModal raffle={raffle} onClose={() => setIsShareModalOpen(false)} />
            )}

            {isConfirmingDelete && (
                <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col justify-center items-center rounded-lg z-10 p-4 text-center">
                    <p className="font-semibold text-gray-800 mb-4">Tem certeza que deseja excluir esta rifa?</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setIsConfirmingDelete(false)}
                            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDelete}
                            className="bg-danger text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                        >
                            Sim, Excluir
                        </button>
                    </div>
                </div>
            )}

            {raffle.imageUrl && (
                <div className="my-4 flex justify-center">
                    <img src={raffle.imageUrl} alt={raffle.name} className="rounded-lg shadow-md max-h-56 object-contain" />
                </div>
            )}

            {raffle.winner ? (
                <div className="text-center p-4 bg-green-100 rounded-lg my-4">
                    <p className="font-semibold text-green-800">Rifa Encerrada!</p>
                    <p className="text-2xl font-bold text-success">Ganhador: Número {raffle.winner}</p>
                </div>
            ) : (
                <div className="my-4">
                    <h4 className="font-semibold mb-2">Declarar Ganhador</h4>
                    <div className="flex gap-2">
                        <input type="number" value={winnerNumber} onChange={(e) => setWinnerNumber(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Número do bilhete" className="p-2 border rounded w-full" />
                        <button onClick={handleSetWinner} className="bg-success text-white px-4 py-2 rounded hover:bg-green-700">Salvar</button>
                    </div>
                </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                    <h4 className="font-semibold mb-2">Pagamentos Pendentes ({reservedTickets.length})</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-white rounded border">
                        {reservedTickets.length > 0 ? reservedTickets.map(ticket => (
                            <div key={ticket.number} className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                                <span>Número: <strong>{ticket.number}</strong></span>
                                <button onClick={() => handleConfirmPayment(ticket.number)} className="bg-success text-white px-3 py-1 text-sm rounded hover:bg-green-700">Confirmar</button>
                            </div>
                        )) : <p className="text-gray-500">Nenhum pagamento pendente.</p>}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Pagamentos Confirmados ({paidTickets.length})</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-white rounded border">
                        {paidTickets.length > 0 ? paidTickets.map(ticket => (
                             <div key={ticket.number} className="flex justify-between items-center p-2 bg-green-100 rounded">
                                <span>Número: <strong>{ticket.number}</strong></span>
                                <span className="text-green-700 font-semibold text-sm">Pago</span>
                            </div>
                        )) : <p className="text-gray-500">Nenhum pagamento confirmado.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


interface AdminPanelProps {
  raffles: Raffle[];
  onAddRaffle: (raffle: Raffle) => void;
  onUpdateRaffle: (updatedRaffle: Raffle) => void;
  onDeleteRaffle: (raffleId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ raffles, onAddRaffle, onUpdateRaffle, onDeleteRaffle }) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleAddRaffle = (raffle: Raffle) => {
    onAddRaffle(raffle);
    setIsCreating(false);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Painel do Administrador</h1>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-secondary transition-colors">
          <GiftIcon className="w-5 h-5" />
          <span>Criar Nova Rifa</span>
        </button>
      </div>
      
      {isCreating && <RaffleForm onSubmit={handleAddRaffle} onClose={() => setIsCreating(false)} />}

      <div className="space-y-6">
        {raffles.length > 0 ? (
            raffles.map(raffle => <ManageRaffle key={raffle.id} raffle={raffle} onUpdateRaffle={onUpdateRaffle} onDeleteRaffle={onDeleteRaffle} />)
        ) : (
            <p className="text-center text-gray-500 py-10">Nenhuma rifa criada ainda.</p>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;