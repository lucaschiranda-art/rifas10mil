import React from 'react';
import { TicketIcon, WhatsAppIcon, FacebookIcon, XSocialIcon } from './icons';

const Footer: React.FC = () => {
    return (
        <footer className="bg-primary text-white">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                    <div className="mb-4 md:mb-0">
                        <div className="flex items-center justify-center md:justify-start gap-2 text-white">
                            <TicketIcon className="w-8 h-8" />
                            <span className="text-2xl font-bold">RifaFácil</span>
                        </div>
                        <p className="text-sm text-blue-200 mt-2">Sua sorte a um clique de distância.</p>
                    </div>

                    <div className="flex justify-center space-x-4">
                        <a href="#" aria-label="WhatsApp" className="text-blue-200 hover:text-white transition-colors">
                            <WhatsAppIcon className="w-6 h-6" />
                        </a>
                        <a href="#" aria-label="Facebook" className="text-blue-200 hover:text-white transition-colors">
                            <FacebookIcon className="w-6 h-6" />
                        </a>
                        <a href="#" aria-label="X" className="text-blue-200 hover:text-white transition-colors">
                            <XSocialIcon className="w-6 h-6" />
                        </a>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-blue-800 text-center text-sm text-blue-300">
                    <p>&copy; {new Date().getFullYear()} RifaFácil. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
