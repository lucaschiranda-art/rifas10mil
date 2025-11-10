import React, { useState, useMemo } from 'react';
import { Raffle, Ticket, TicketStatus } from '../types';
import { GiftIcon, TrashIcon, XCircleIcon, PencilIcon, ClipboardIcon, QrCodeIcon, DownloadIcon, SparklesIcon } from './icons';
import { storage } from '../firebase';

const LoadingSpinner: React.FC<{className?: string}> = ({ className = 'w-5 h-5' }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


interface RaffleFormProps {
  onSubmit: (raffle: Omit<Raffle, 'id'>) => Promise<void>;
  onClose: () => void;
  initialRaffle?: Raffle;
}

const RaffleForm: React.FC<RaffleFormProps> = ({ onSubmit, onClose, initialRaffle }) => {
  const isEditMode = !!initialRaffle;

  const formatDateForInput = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      // Adjust for timezone offset
      const timezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() - timezoneOffset);
      return adjustedDate.toISOString().slice(0, 16);
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
  const [imageUrl, setImageUrl] = useState(initialRaffle?.imageUrl || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setImageFile(file);
        setImageUrl(''); // Clear URL if a file is selected
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !prize || !ticketPrice || !totalTickets || !drawDate || !pixKey) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    setIsSubmitting(true);
    let finalImageUrl = imageUrl;

    try {
        if (imageFile) {
            setUploadProgress(0);
            const storageRef = storage.ref(`raffles/${Date.now()}_${imageFile.name}`);
            const uploadTask = storageRef.put(imageFile);

            finalImageUrl = await new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    }, 
                    (error) => {
                        console.error("Upload failed:", error);
                        reject(error);
                    }, 
                    () => {
                        uploadTask.snapshot.ref.getDownloadURL().then(resolve).catch(reject);
                    }
                );
            });
            
            setImageUrl(finalImageUrl);
            setUploadProgress(null);
            setImageFile(null);
        }

        if (isEditMode) {
            const { id, ...restOfInitial } = initialRaffle;
            const updatedRafflePayload: Omit<Raffle, 'id'> = {
                ...restOfInitial,
                name,
                description,
                prize,
                imageUrl: finalImageUrl || undefined,
                ticketPrice,
                drawDate,
                pixKey,
            };
            await onSubmit(updatedRafflePayload);
        } else {
            const tickets: Ticket[] = Array.from({ length: totalTickets }, (_, i) => ({
                number: i + 1,
                status: TicketStatus.AVAILABLE,
            }));
            const newRaffle: Omit<Raffle, 'id'> = {
                name,
                description,
                prize,
                imageUrl: finalImageUrl || undefined,
                ticketPrice,
                totalTickets,
                drawDate,
                pixKey,
                tickets,
                createdAt: Date.now(),
            };
            await onSubmit(newRaffle);
        }
    } catch (error) {
        console.error("Error submitting raffle:", error);
        alert("Ocorreu um erro ao salvar a rifa. Tente novamente.");
    } finally {
        setIsSubmitting(false);
        setUploadProgress(null);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-primary">{isEditMode ? 'Editar Rifa' : 'Criar Nova Rifa'}</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 disabled:opacity-50" disabled={isSubmitting}>
            <XCircleIcon className="w-8 h-8" />
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Nome da Rifa" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" required disabled={isSubmitting}/>
          <textarea placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded" disabled={isSubmitting}/>
          <input type="text" placeholder="Prêmio" value={prize} onChange={e => setPrize(e.target.value)} className="w-full p-2 border rounded" required disabled={isSubmitting}/>
          <div>
            <label className="block text-sm font-medium text-gray-700">Imagem do Prêmio</label>
            <div className="mt-1 flex items-center space-x-4">
                <input 
                    type="url" 
                    placeholder="Cole a URL da imagem aqui" 
                    value={imageUrl} 
                    onChange={e => { setImageUrl(e.target.value); setImageFile(null); }} 
                    className="w-full p-2 border rounded flex-grow" 
                    disabled={isSubmitting || uploadProgress !== null}
                />
                <span className="text-gray-500">OU</span>
                <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting || uploadProgress !== null}
                />
                <label htmlFor="file-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap">
                    Carregar
                </label>
            </div>
            {uploadProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
            )}
            {(imageUrl || imageFile) && (
                <div className="mt-2 flex justify-center">
                    <img 
                        src={imageFile ? URL.createObjectURL(imageFile) : imageUrl} 
                        alt="Preview" 
                        className="rounded-lg max-h-40 w-auto shadow-sm object-contain" 
                    />
                </div>
            )}
          </div>
          <input type="number" placeholder="Valor por Número (R$)" value={ticketPrice} onChange={e => setTicketPrice(Number(e.target.value))} className="w-full p-2 border rounded" min="0.01" step="0.01" required disabled={isSubmitting}/>
          <input type="number" placeholder="Quantidade de Números" value={totalTickets} onChange={e => setTotalTickets(Number(e.target.value))} className="w-full p-2 border rounded disabled:bg-gray-200" min="1" required disabled={isEditMode || isSubmitting}/>
          <input type="datetime-local" value={drawDate} onChange={e => setDrawDate(e.target.value)} className="w-full p-2 border rounded" required disabled={isSubmitting}/>
          <input type="text" placeholder="Chave PIX" value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full p-2 border rounded" required disabled={isSubmitting}/>
          <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-secondary transition-colors flex justify-center items-center gap-2 disabled:bg-gray-400" disabled={isSubmitting}>
            {isSubmitting && <LoadingSpinner />}
            {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Rifa'}
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
    const [isConfirmingDraw, setIsConfirmingDraw] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const reservedTickets = raffle.tickets.filter(t => t.status === TicketStatus.RESERVED);
    const paidTickets = raffle.tickets.filter(t => t.status === TicketStatus.PAID);

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
    
    const handleDrawWinner = () => {
        if (paidTickets.length === 0) {
            alert('Não há bilhetes pagos para realizar o sorteio.');
            setIsConfirmingDraw(false);
            return;
        }
        const winnerIndex = Math.floor(Math.random() * paidTickets.length);
        const winnerTicket = paidTickets[winnerIndex];

        onUpdateRaffle({ ...raffle, winner: winnerTicket.number });
        setIsConfirmingDraw(false);
    };

    const handleDelete = () => {
        onDeleteRaffle(raffle.id);
        setIsConfirmingDelete(false);
    }
    
    const handleUpdateRaffle = async (updatedRaffleData: Omit<Raffle, 'id'>) => {
        const updatedRaffle = {
            ...updatedRaffleData,
            id: raffle.id,
            // Ensure non-editable fields are preserved
            tickets: raffle.tickets,
            totalTickets: raffle.totalTickets,
            createdAt: raffle.createdAt,
            winner: raffle.winner
        }
        onUpdateRaffle(updatedRaffle);
        setIsEditing(false);
    }

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
            
            {isConfirmingDraw && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-20 p-4 text-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold text-primary mb-4">Confirmar Sorteio</h3>
                        <p className="text-gray-700 mb-6">
                            Você está prestes a sortear um ganhador para a rifa <strong className="font-semibold">{raffle.name}</strong>. Esta ação é irreversível.
                            <br/><br/>
                            Apenas bilhetes com pagamento confirmado serão incluídos. Deseja continuar?
                        </p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => setIsConfirmingDraw(false)}
                                className="bg-gray-300 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors font-semibold"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleDrawWinner}
                                className="bg-success text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-semibold"
                            >
                                Sim, Sortear!
                            </button>
                        </div>
                    </div>
                </div>
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
                <div className="my-4 p-4 border rounded-lg bg-white">
                    <h4 className="font-semibold mb-2 text-gray-800">Declarar Ganhador</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input type="number" value={winnerNumber} onChange={(e) => setWinnerNumber(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Número manual" className="p-2 border rounded w-full sm:w-auto flex-grow" />
                        <button onClick={handleSetWinner} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">Salvar Manual</button>
                        <button 
                            onClick={() => setIsConfirmingDraw(true)} 
                            disabled={paidTickets.length === 0}
                            className="flex items-center justify-center gap-2 bg-accent text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            title={paidTickets.length === 0 ? "Nenhum bilhete pago para sortear" : "Sortear um ganhador automaticamente"}
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Sortear Automático
                        </button>
                    </div>
                </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                    <h4 className="font-semibold mb-2">Pagamentos Pendentes ({reservedTickets.length})</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-white rounded border">
                        {reservedTickets.length > 0 ? reservedTickets.map(ticket => (
                            <div key={ticket.number} className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                                <div>
                                    <p>Número: <strong>{ticket.number}</strong></p>
                                    <p className="text-xs text-gray-600">{ticket.ownerName} - {ticket.ownerContact}</p>
                                </div>
                                <button onClick={() => handleConfirmPayment(ticket.number)} className="bg-success text-white px-3 py-1 text-sm rounded hover:bg-green-700 ml-2 flex-shrink-0">Confirmar</button>
                            </div>
                        )) : <p className="text-gray-500">Nenhum pagamento pendente.</p>}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Pagamentos Confirmados ({paidTickets.length})</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-white rounded border">
                        {paidTickets.length > 0 ? paidTickets.map(ticket => (
                             <div key={ticket.number} className="flex justify-between items-center p-2 bg-green-100 rounded">
                                <div>
                                    <p>Número: <strong>{ticket.number}</strong></p>
                                    <p className="text-xs text-green-800">{ticket.ownerName}</p>
                                </div>
                                <span className="text-green-700 font-semibold text-sm">Pago</span>
                            </div>
                        )) : <p className="text-gray-500">Nenhum pagamento confirmado.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmptyAdminState: React.FC<{ onOpenCreator: () => void }> = ({ onOpenCreator }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md border border-gray-200">
        <GiftIcon className="mx-auto h-16 w-16 text-primary opacity-50" />
        <h3 className="mt-4 text-2xl font-semibold text-gray-800">Nenhuma Rifa Encontrada</h3>
        <p className="mt-2 text-gray-500">Parece que você ainda não criou nenhuma rifa. Que tal começar agora?</p>
        <div className="mt-6">
            <button
                onClick={onOpenCreator}
                type="button"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
                Criar Primeira Rifa
            </button>
        </div>
    </div>
);


interface AdminPanelProps {
  raffles: Raffle[];
  onAddRaffle: (raffle: Omit<Raffle, 'id'>) => Promise<void>;
  onUpdateRaffle: (updatedRaffle: Raffle) => void;
  onDeleteRaffle: (raffleId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ raffles, onAddRaffle, onUpdateRaffle, onDeleteRaffle }) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleAddRaffle = async (raffle: Omit<Raffle, 'id'>) => {
    await onAddRaffle(raffle);
    setIsCreating(false);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Painel do Administrador</h1>
        {raffles.length > 0 && (
            <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-secondary transition-colors">
                <GiftIcon className="w-5 h-5" />
                <span>Criar Nova Rifa</span>
            </button>
        )}
      </div>
      
      {isCreating && <RaffleForm onSubmit={handleAddRaffle} onClose={() => setIsCreating(false)} />}

      <div className="bg-blue-50 border-l-4 border-primary text-primary p-4 my-6 rounded-r-lg shadow-sm" role="alert">
          <p className="font-bold">Receba Notificações!</p>
          <p className="text-sm">Receba notificações de novas reservas no app <a href="https://ntfy.sh/docs/subscribe/phone/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-secondary">ntfy</a>. Inscreva-se no tópico: <code className="bg-blue-100 px-1 py-0.5 rounded">rifafacil-admin-notifications-a1b2c3d4e5f6</code></p>
      </div>

      <div className="space-y-6">
        {raffles.length > 0 ? (
            raffles.map(raffle => <ManageRaffle key={raffle.id} raffle={raffle} onUpdateRaffle={onUpdateRaffle} onDeleteRaffle={onDeleteRaffle} />)
        ) : (
            <EmptyAdminState onOpenCreator={() => setIsCreating(true)} />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;