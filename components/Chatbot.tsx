import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { GoogleGenAI, Chat, Modality } from '@google/genai';
import { XCircleIcon } from './icons';

const SendIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 6z"/>
    </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
    </svg>
);

const SpeakerWaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
  </svg>
);

interface Message {
    role: 'user' | 'model';
    text: string;
    isAudioResponse?: boolean;
}

// --- Audio Helper Functions ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}


const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Olá! 👋 Bem-vindo(a) ao RifaFácil! Sou seu assistente virtual e estou aqui para ajudar com qualquer dúvida sobre nossas rifas. Como posso te ajudar hoje? 😊' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && !audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.", e);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        if (!process.env.API_KEY) {
            console.error("API_KEY is not set.");
            setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, o serviço de chat não está configurado corretamente.' }]);
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: `
Você é um assistente virtual para o site RifaFácil. Seu objetivo é ajudar os usuários a entender como o site funciona e responder perguntas sobre as rifas. Seja amigável, claro e use emojis.

Temos uma rifa especial ativa: "Rifa do iPhone 15 Pro". Se perguntarem sobre este prêmio, use as seguintes especificações detalhadas para responder. Aja como um especialista no produto.

**Especificações do iPhone 15 Pro (Prêmio da Rifa):**

*   **Design e Tela:**
    *   **Material:** Titânio de qualidade aeroespacial, mais leve e resistente.
    *   **Tela:** Super Retina XDR de 6,1 polegadas com ProMotion, que ajusta a taxa de atualização até 120Hz para gráficos mais fluidos.
    *   **Recursos da Tela:** Dynamic Island (para alertas e atividades ao vivo), Tela Sempre Ativa.
    *   **Proteção:** Ceramic Shield na frente, mais resistente que qualquer vidro de smartphone.

*   **Desempenho:**
    *   **Chip:** A17 Pro, um chip revolucionário com CPU de 6 núcleos e GPU de 6 núcleos, oferecendo desempenho gráfico de nível profissional e jogos imersivos.

*   **Sistema de Câmera Pro:**
    *   **Câmera Principal:** Grande-angular de 48 MP para fotos de altíssima resolução com detalhes incríveis.
    *   **Câmera Ultra-angular:** 12 MP.
    *   **Câmera Teleobjetiva:** 2x de 12 MP e 3x de 12 MP, com zoom óptico de até 3x.
    *   **Vídeo:** Gravação de vídeo 4K a 24, 25, 30 ou 60 fps. Modo Cinema para vídeos com profundidade de campo. Gravação de vídeo ProRes.
    *   **Recursos Adicionais:** Photonic Engine, Deep Fusion, Smart HDR 5, Modo Noite.

*   **Conectividade e Bateria:**
    *   **Conector:** USB-C compatível com USB 3 para transferências de dados até 20x mais rápidas.
    *   **Bateria:** Dura o dia todo, com até 23 horas de reprodução de vídeo.

*   **Outras Características:**
    *   **Botão de Ação:** Um atalho configurável para sua função favorita.
    *   **Segurança:** Face ID para autenticação segura.

*   **Foto do Prêmio:** Se pedirem uma foto, diga que não pode mostrar imagens no chat, mas descreva a imagem de divulgação: 'A imagem promocional mostra o iPhone 15 Pro em um fundo azul escuro com o texto "iPhone 15 Pro" em branco, destacando seu design elegante.' A imagem está no link: https://placehold.co/600x400/0D47A1/FFFFFF/png?text=iPhone+15+Pro.

Para todas as outras perguntas sobre outras rifas, regras do site, pagamentos, ou se não souber a resposta, continue com seu comportamento padrão de assistente e, se necessário, diga que vai verificar com a equipe de suporte.
`,
                },
            });
            chatRef.current = chat;
        } catch (error) {
            console.error("Error initializing Gemini Chat:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, não consegui me conectar ao serviço de IA. Verifique a configuração.' }]);
        }
    }, [isOpen]);

    const playAudio = async (base64String: string) => {
        if (!audioContextRef.current) return;
        try {
            const audioBuffer = await decodeAudioData(
                decode(base64String),
                audioContextRef.current,
                24000,
                1,
            );
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
        } catch(e) {
            console.error("Error playing audio:", e)
        }
    };

    const handleAudioMessage = async (base64Audio: string) => {
        setIsLoading(true);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        try {
            const transcribeResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
                        { text: "Transcreva este áudio em português." }
                    ]
                }
            });
            const userMessage = transcribeResponse.text.trim();
            if (!userMessage) {
                 throw new Error("Transcrição falhou ou o áudio estava vazio.");
            }
            setMessages(prev => [...prev, { role: 'user', text: `🎤 "${userMessage}"` }]);

            if (!chatRef.current) throw new Error("Chat not initialized");
            const chatResponse = await chatRef.current.sendMessage({ message: userMessage });
            const botMessageText = chatResponse.text;
            setMessages(prev => [...prev, { role: 'model', text: 'Resposta em áudio...', isAudioResponse: true }]);

            const ttsResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: botMessageText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                }
            });
            
            const base64AudioResponse = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64AudioResponse) {
                await playAudio(base64AudioResponse);
            }

        } catch (error) {
            console.error("Error processing audio message:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema ao processar seu áudio. Tente novamente.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMicClick = async () => {
        if (isLoading) return;

        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];

                recorder.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                recorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());
                    
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        handleAudioMessage(base64Audio);
                    };
                };

                recorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Error accessing microphone:", err);
                setMessages(prev => [...prev, { role: 'model', text: 'Não consegui acessar seu microfone. Por favor, verifique as permissões do seu navegador.' }]);
            }
        }
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        const userMessage = inputValue.trim();
        if (!userMessage || isLoading || !chatRef.current) return;

        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await chatRef.current.sendMessage({ message: userMessage });
            const botMessage = response.text;
            setMessages(prev => [...prev, { role: 'model', text: botMessage }]);
        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-40 z-40"
                onClick={onClose}
            ></div>
            <div className="fixed bottom-5 right-5 w-full max-w-sm h-[60vh] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 animate-fade-in-up">
                <header className="bg-primary text-white p-4 flex justify-between items-center rounded-t-lg">
                    <div>
                        <h3 className="font-bold text-lg">Assistente RifaFácil</h3>
                        <p className="text-xs text-blue-200">Tire suas dúvidas sobre nossas rifas</p>
                    </div>
                    <button onClick={onClose} aria-label="Fechar chat">
                        <XCircleIcon className="w-7 h-7 hover:text-red-300" />
                    </button>
                </header>

                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-xs rounded-xl px-4 py-2 shadow-sm ${
                                        msg.role === 'user'
                                            ? 'bg-secondary text-white'
                                            : 'bg-gray-200 text-gray-800'
                                    }`}
                                >
                                    {msg.isAudioResponse ? (
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <SpeakerWaveIcon className="w-5 h-5"/>
                                            <span className="text-sm italic">{msg.text}</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                    <div className="bg-gray-200 text-gray-800 rounded-xl px-4 py-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <footer className="p-2 border-t bg-white">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isRecording ? "Gravando..." : "Digite sua dúvida..."}
                            className="flex-1 p-2 border rounded-full focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100"
                            disabled={isLoading || isRecording}
                            autoComplete="off"
                        />
                            <button
                            type="button"
                            onClick={handleMicClick}
                            className={`${isRecording ? 'bg-red-500' : 'bg-secondary'} text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 disabled:bg-gray-400`}
                            disabled={isLoading}
                            aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}
                        >
                            <MicIcon className="w-5 h-5" />
                        </button>
                        <button
                            type="submit"
                            className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 disabled:bg-gray-400"
                            disabled={isLoading || !inputValue.trim() || isRecording}
                            aria-label="Enviar mensagem"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </footer>
            </div>
            
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default Chatbot;