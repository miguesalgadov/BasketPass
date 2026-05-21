import { chatRepository } from './chat.repository';
import { SendMessageDto } from './chat.schema';

export const chatService = {
  getMessages: (teamId?: string) => chatRepository.getMessages(teamId),
  send: (senderId: string, dto: SendMessageDto) => chatRepository.send(senderId, dto),
};
