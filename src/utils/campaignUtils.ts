// Utility functions for campaign management
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export const toBrazilTime = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(d, BRAZIL_TIMEZONE);
};

export const fromBrazilTime = (date: Date): Date => {
  return fromZonedTime(date, BRAZIL_TIMEZONE);
};

export const calculateNextSendDates = (
  startDate: Date,
  cycleType: 'weekly' | 'biweekly',
  attemptsTotal: number
): Date[] => {
  const dates: Date[] = [];
  const daysPerCycle = cycleType === 'weekly' ? 7 : 15;
  
  for (let i = 0; i < attemptsTotal; i++) {
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + (i * daysPerCycle));
    dates.push(nextDate);
  }
  
  return dates;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const brazilDate = toBrazilTime(d);
  return format(brazilDate, 'dd/MM/yyyy HH:mm');
};

export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: 'Rascunho',
    scheduled: 'Agendada',
    live: 'Ativa',
    paused: 'Pausada',
    completed: 'Encerrada',
    cancelled: 'Cancelada'
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-blue-100 text-blue-700',
    live: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700'
  };
  return colorMap[status] || 'bg-muted text-muted-foreground';
};

export const getCycleLabel = (cycleType: string | null): string => {
  if (!cycleType) return '-';
  return cycleType === 'weekly' ? 'Semanal (7 dias)' : 'Quinzenal (15 dias)';
};
