import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Raffle } from './types';
import { RaffleList, RafflePage } from './components/Raffle';
import AdminPanel from './components/AdminPanel';
import { TicketIcon, CogIcon } from './components/icons';
import { TicketStatus } from './types';

// Mock Data
const createMockRaffles = (): Raffle[] => {
    const drawDate1 = new Date();
    drawDate1.setDate(drawDate1.getDate() + 15);
    const drawDate2 = new Date();
    drawDate2.setDate(drawDate2.getDate() + 30);

    return [
        {
            id: 'raffle-1',
            name: 'Rifa do iPhone 15 Pro',
            description: 'Concorra a um iPhone 15 Pro novinho em folha!',
            prize: 'iPhone 15 Pro 256GB',
            imageUrl: 'https://placehold.co/600x400/0D47A1/FFFFFF/png?text=iPhone+15+Pro',
            ticketPrice: 2.50,
            totalTickets: 200,
            drawDate: drawDate1.toISOString(),
            pixKey: 'd2a7c8f8-b397-4e2b-9a1c-5d1e6f7a8b9c',
            tickets: Array.from({ length: 200 }, (_, i) => ({
                number: i + 1,
                status: i < 50 ? TicketStatus.PAID : (i < 60 ? TicketStatus.RESERVED : TicketStatus.AVAILABLE),
            })),
            createdAt: Date.now() - 100000,
        },
        {
            id: 'raffle-2',
            name: 'Rifa Gamer: PS5 + TV 4K',
            description: 'Kit completo para sua diversão!',
            prize: 'Playstation 5 + TV Samsung 55" 4K',
            imageUrl: 'https://placehold.co/600x400/D32F2F/FFFFFF/png?text=PS5+%2B+TV',
            ticketPrice: 5.00,
            totalTickets: 500,
            drawDate: drawDate2.toISOString(),
            pixKey: 'contato@viveirolu.com',
            tickets: Array.from({ length: 500 }, (_, i) => ({
                number: i + 1,
                status: TicketStatus.AVAILABLE,
            })),
            createdAt: Date.now(),
        },
    ];
};


type View = 
  | { name: 'list' }
  | { name: 'details'; raffleId: string }
  | { name: 'admin' };

const App: React.FC = () => {
  const [raffles, setRaffles] = useState<Raffle[]>(() => {
    try {
        const savedRaffles = localStorage.getItem('rifascuiaba_raffles');
        if (savedRaffles) {
            return JSON.parse(savedRaffles);
        }
    } catch (error) {
        console.error("Failed to parse raffles from localStorage", error);
    }
    return createMockRaffles();
  });
  
  const [view, setView] = useState<View>({ name: 'list' });
  const [isDeepLinkView, setIsDeepLinkView] = useState(false);

  // Handle deep linking from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raffleId = params.get('raffle');
    if (raffleId) {
        const foundRaffle = raffles.find(r => r.id === raffleId);
        if (foundRaffle) {
            setView({ name: 'details', raffleId: raffleId });
            setIsDeepLinkView(true);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on initial load. `raffles` is sync, so it's safe.


  const sortedRaffles = useMemo(() => 
    [...raffles].sort((a, b) => b.createdAt - a.createdAt)
  , [raffles]);

  useEffect(() => {
    try {
        localStorage.setItem('rifascuiaba_raffles', JSON.stringify(raffles));
    } catch (error) {
        console.error("Failed to save raffles to localStorage", error);
    }
  }, [raffles]);

  const handleNavigate = (newView: View) => {
    if (isDeepLinkView) {
        setIsDeepLinkView(false);
    }
    setView(newView);
  };

  const handleAddRaffle = useCallback((newRaffle: Raffle) => {
    setRaffles(prev => [newRaffle, ...prev]);
  }, []);

  const handleUpdateRaffle = useCallback((updatedRaffle: Raffle) => {
    setRaffles(prev => prev.map(r => r.id === updatedRaffle.id ? updatedRaffle : r));
  }, []);
  
  const handleDeleteRaffle = useCallback((raffleId: string) => {
    setRaffles(prev => prev.filter(r => r.id !== raffleId));
  }, []);

  const renderContent = () => {
    switch (view.name) {
      case 'list':
        return <RaffleList raffles={sortedRaffles} onSelectRaffle={(id) => handleNavigate({ name: 'details', raffleId: id })} />;
      case 'details':
        const raffle = raffles.find(r => r.id === view.raffleId);
        if (raffle) {
          return <RafflePage raffle={raffle} onUpdateRaffle={handleUpdateRaffle} isDeepLinkView={isDeepLinkView} onNavigateHome={() => handleNavigate({ name: 'list' })} />;
        }
        handleNavigate({ name: 'list' }); // Fallback
        return null;
      case 'admin':
        return <AdminPanel raffles={sortedRaffles} onAddRaffle={handleAddRaffle} onUpdateRaffle={handleUpdateRaffle} onDeleteRaffle={handleDeleteRaffle} />;
      default:
        return <RaffleList raffles={sortedRaffles} onSelectRaffle={(id) => handleNavigate({ name: 'details', raffleId: id })} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
       {!isDeepLinkView && (
            <header className="bg-primary shadow-md sticky top-0 z-40">
                <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div 
                    onClick={() => handleNavigate({ name: 'list' })} 
                    className="flex items-center gap-2 cursor-pointer text-white hover:text-accent transition-colors"
                >
                    <TicketIcon className="w-8 h-8" />
                    <span className="text-lg md:text-2xl font-bold">RifasCUIABÀ-Viveiro Lu rosa do deserto</span>
                </div>
                <button 
                    onClick={() => handleNavigate({ name: 'admin' })} 
                    className="flex items-center gap-2 text-white bg-secondary py-2 px-4 rounded-lg hover:bg-accent transition-colors"
                >
                    <CogIcon className="w-5 h-5"/>
                    <span className="hidden sm:inline">Admin</span>
                </button>
                </nav>
            </header>
        )}
      <main>
        {renderContent()}
      </main>
      {!isDeepLinkView && (
            <footer className="text-center p-4 text-gray-500 text-sm mt-8 border-t">
                <p>&copy; {new Date().getFullYear()} RifasCUIABÀ-Viveiro Lu rosa do deserto. Todos os direitos reservados.</p>
            </footer>
        )}
    </div>
  );
};

export default App;