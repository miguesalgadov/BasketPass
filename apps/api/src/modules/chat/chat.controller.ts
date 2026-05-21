import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { chatService } from './chat.service';
import { sendMessageSchema } from './chat.schema';
import { io } from '@/index';

export const chatController = {
  async getMessages(req: AuthenticatedRequest, res: Response) {
    const teamId = req.query.teamId as string | undefined;
    const messages = await chatService.getMessages(teamId);
    res.json({ success: true, data: messages.reverse() });
  },

  async send(req: AuthenticatedRequest, res: Response) {
    const dto = sendMessageSchema.parse(req.body);
    const message = await chatService.send(req.user!.id, dto);
    // Broadcast via Socket.io
    const room = dto.teamId ? `team:${dto.teamId}` : 'club';
    io.to(room).emit('message:new', message);
    res.status(201).json({ success: true, data: message });
  },
};
