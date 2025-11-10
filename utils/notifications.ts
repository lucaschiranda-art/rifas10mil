// utils/notifications.ts

// O administrador deve instalar o app "ntfy" e se inscrever neste tópico.
// O tópico deve ser único para evitar que outros recebam suas notificações.
const NTFY_TOPIC = 'rifafacil-admin-notifications-a1b2c3d4e5f6';
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

/**
 * Envia uma notificação para o canal do administrador.
 * @param message A mensagem a ser enviada.
 */
export const sendAdminNotification = async (message: string): Promise<void> => {
  try {
    await fetch(NTFY_URL, {
      method: 'POST',
      body: message,
      headers: {
        'Title': 'Nova Reserva na Rifa!',
        'Priority': 'high',
        'Tags': 'tada,moneybag'
      }
    });
  } catch (error) {
    console.error('Falha ao enviar notificação para o administrador:', error);
    // A falha na notificação não deve impedir a experiência do usuário.
  }
};
