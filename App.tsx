import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './firebase';
import { Raffle } from './types';
import { RaffleList, RafflePage } from './components/Raffle';
import AdminPanel from './components/AdminPanel';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';
import { TicketIcon, WhatsAppIcon } from './components/icons';
import LoginModal from './components/LoginModal';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div>
);


type View = 
  | { name: 'list' }
  | { name: 'details'; raffleId: string }
  | { name: 'admin' };

const App: React.FC = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'list' });
  const [isDeepLinkView, setIsDeepLinkView] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Secret admin access logic
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<number | null>(null);

  const handleLogoClick = () => {
    logoClickCount.current += 1;
    if(logoClickTimer.current) clearTimeout(logoClickTimer.current);

    logoClickTimer.current = window.setTimeout(() => {
        logoClickCount.current = 0;
    }, 1500); // Reset after 1.5 seconds of inactivity

    if (logoClickCount.current === 5) {
        logoClickCount.current = 0;
        if(logoClickTimer.current) clearTimeout(logoClickTimer.current);
        handleNavigate({ name: 'admin' });
    }
  };
  
  // Load raffles from Firestore on initial render
  useEffect(() => {
    const fetchRaffles = async () => {
      setIsLoading(true);
      try {
        // Fix: Use Firebase v8 namespaced API
        const rafflesCollection = db.collection('raffles');
        // Fix: Use Firebase v8 namespaced API
        const q = rafflesCollection.orderBy('createdAt', 'desc');
        // Fix: Use Firebase v8 namespaced API
        const querySnapshot = await q.get();
        // Fix: Use Firebase v8 namespaced API and remove incorrect type annotation
        const rafflesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Raffle[];
        setRaffles(rafflesData);
      } catch (error: any) {
        console.error("Error fetching raffles from Firestore:", error);
        const errorMessage = error.code === 'permission-denied'
          ? "Erro de permissão. Verifique as regras de segurança do seu Firestore para permitir leitura."
          : `Não foi possível carregar as rifas: ${error.message}`;
        alert(errorMessage);
        setRaffles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRaffles();
  }, []);


  // Handle deep linking from URL
  useEffect(() => {
    if(isLoading) return; // Wait for raffles to be loaded
    const params = new URLSearchParams(window.location.search);
    const raffleId = params.get('raffle');
    if (raffleId) {
        const foundRaffle = raffles.find(r => r.id === raffleId);
        if (foundRaffle) {
            setView({ name: 'details', raffleId: raffleId });
            setIsDeepLinkView(true);
        }
    }
  }, [isLoading, raffles]);


  const handleNavigate = (newView: View) => {
    if (isDeepLinkView) {
        const url = new URL(window.location.href);
        url.searchParams.delete('raffle');
        window.history.pushState({}, '', url);
        setIsDeepLinkView(false);
    }
    setView(newView);
    window.scrollTo(0, 0);
  };

  const handleAddRaffle = useCallback(async (newRaffleData: Omit<Raffle, 'id'>) => {
    try {
      // Fix: Use Firebase v8 namespaced API
      const docRef = await db.collection('raffles').add(newRaffleData);
      const newRaffle = { id: docRef.id, ...newRaffleData } as Raffle;
      setRaffles(prev => [newRaffle, ...prev]);
    } catch (error: any) {
      console.error("Error adding raffle to Firestore: ", error);
      const errorMessage = error.code === 'permission-denied' 
        ? "Erro de permissão. Verifique as regras de segurança do seu Firestore para permitir escrita."
        : `Ocorreu um erro ao criar a rifa: ${error.message}`;
      alert(errorMessage);
    }
  }, []);

  const handleUpdateRaffle = useCallback(async (updatedRaffle: Raffle) => {
    try {
      const { id, ...raffleData } = updatedRaffle;
      // Fix: Use Firebase v8 namespaced API
      const raffleDoc = db.collection('raffles').doc(id);
      await raffleDoc.update(raffleData);
      setRaffles(prev => prev.map(r => r.id === updatedRaffle.id ? updatedRaffle : r));
    } catch (error: any) {
      console.error("Error updating raffle in Firestore: ", error);
      const errorMessage = error.code === 'permission-denied' 
        ? "Erro de permissão. Verifique as regras de segurança do seu Firestore para permitir escrita."
        : `Ocorreu um erro ao atualizar a rifa: ${error.message}`;
      alert(errorMessage);
    }
  }, []);
  
  const handleDeleteRaffle = useCallback(async (raffleId: string) => {
    try {
      // Fix: Use Firebase v8 namespaced API
      await db.collection('raffles').doc(raffleId).delete();
      setRaffles(prev => prev.filter(r => r.id !== raffleId));
    } catch (error: any) {
      console.error("Error deleting raffle from Firestore: ", error);
      const errorMessage = error.code === 'permission-denied' 
        ? "Erro de permissão. Verifique as regras de segurança do seu Firestore para permitir exclusão."
        : `Ocorreu um erro ao excluir a rifa: ${error.message}`;
      alert(errorMessage);
    }
  }, []);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  const renderContent = () => {
    switch (view.name) {
      case 'list':
        return <RaffleList raffles={raffles} onSelectRaffle={(id) => handleNavigate({ name: 'details', raffleId: id })} />;
      case 'details':
        const raffle = raffles.find(r => r.id === view.raffleId);
        if (raffle) {
          return <RafflePage raffle={raffle} onUpdateRaffle={handleUpdateRaffle} isDeepLinkView={isDeepLinkView} onNavigateHome={() => handleNavigate({ name: 'list' })} />;
        }
        handleNavigate({ name: 'list' }); // Fallback
        return null;
      case 'admin':
        if (!isAdminAuthenticated) {
            return <LoginModal onLoginSuccess={() => setIsAdminAuthenticated(true)} onClose={() => handleNavigate({name: 'list'})} />;
        }
        return <AdminPanel raffles={raffles} onAddRaffle={handleAddRaffle} onUpdateRaffle={handleUpdateRaffle} onDeleteRaffle={handleDeleteRaffle} />;
      default:
        return <RaffleList raffles={raffles} onSelectRaffle={(id) => handleNavigate({ name: 'details', raffleId: id })} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
       <header className="bg-primary shadow-md sticky top-0 z-40">
            <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div 
                onClick={handleLogoClick} 
                className="flex items-center gap-2 cursor-pointer text-white hover:text-accent transition-colors"
                title="Acesso secreto do administrador"
            >
                <TicketIcon className="w-8 h-8" />
                <span className="text-lg md:text-2xl font-bold">RifaFácil</span>
            </div>
            <button 
                onClick={() => handleNavigate({ name: 'list' })} 
                className="text-white hover:underline"
            >
                Início
            </button>
            </nav>
        </header>
      <main className="flex-grow">
        {renderContent()}
      </main>
      <Footer />
       {!isChatbotOpen && view.name !== 'admin' && (
         <button
            onClick={() => setIsChatbotOpen(true)}
            className="fixed bottom-6 right-6 bg-green-500 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-transform hover:scale-110"
            aria-label="Abrir chat de ajuda"
            title="Tire suas dúvidas"
        >
            <WhatsAppIcon className="w-8 h-8" />
        </button>
       )}
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
};

export default App;
