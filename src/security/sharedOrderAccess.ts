import { AppDataSource } from "../utils/db";
import { SharedOrderParticipant } from "../entities/SharedOrderParticipant";

export const getActiveSharedOrderParticipant = (sessionId: string, userId: number) =>
  AppDataSource.getRepository(SharedOrderParticipant).findOne({ where: { sessionId, userId, status: "active" } });

export const getSharedOrderParticipantUserIds = async (sessionId: string) =>
  (await AppDataSource.getRepository(SharedOrderParticipant).find({ where: { sessionId, status: "active" } }))
    .map((participant) => participant.userId);
