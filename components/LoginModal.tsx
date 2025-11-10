import React, { useState, FormEvent } from 'react';
import { XCircleIcon } from './icons';

interface LoginModalProps {
  onLoginSuccess: () => void;
  onClose: () => void;
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLoginSuccess();
    } else {
      setError('Senha incorreta. Tente novamente.');
      setPassword('');
    }
  };

  if (!ADMIN_PASSWORD) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm relative text-center">
            <h2 className="text-xl font-bold mb-4 text-danger">Erro de Configuração</h2>
            <p className="text-gray-700">
                A senha de administrador não foi configurada no ambiente. Por favor, peça ao proprietário do site para configurar a variável de ambiente <code className="bg-gray-200 text-sm p-1 rounded">ADMIN_PASSWORD</code>.
            </p>
            <button onClick={onClose} className="w-full bg-gray-500 text-white p-3 mt-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors">
                Voltar
            </button>
          </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm relative text-center">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
            <XCircleIcon className="w-7 h-7" />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-primary">Acesso Restrito</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
                setPassword(e.target.value);
                if(error) setError('');
            }}
            placeholder="Digite a senha de administrador"
            className="w-full p-3 border-2 rounded-lg text-center focus:ring-2 focus:ring-primary focus:outline-none"
            autoFocus
          />
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
          <button type="submit" className="w-full bg-primary text-white p-3 mt-4 rounded-lg font-semibold hover:bg-secondary transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;