import { HttpError } from "../../utils/httpError";

export interface StatsPeriod {
  days: number;
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}

const startOfDay = (date: Date) => { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; };
const endOfDay = (date: Date) => { const value = new Date(date); value.setHours(23, 59, 59, 999); return value; };

export const createStatsPeriod = (requestedDays: number, now = new Date()): StatsPeriod => {
  const parsed = Number(requestedDays || 7);
  if (!Number.isFinite(parsed)) throw new HttpError(400, "Periodo inválido");
  const days = Math.min(Math.max(Math.trunc(parsed), 1), 365);
  const currentEnd = endOfDay(now);
  const currentStart = startOfDay(now);
  currentStart.setDate(currentStart.getDate() - (days - 1));
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = startOfDay(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));
  return { days, currentStart, currentEnd, previousStart, previousEnd };
};

export const percentageChange = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : Number((((current - previous) / previous) * 100).toFixed(1));

export const percentage = (part: number, total: number) => total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;
