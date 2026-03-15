import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Play, Pause, CheckCircle2 } from "lucide-react";
import { calculateNextSendDates, formatDate, fromBrazilTime, getStatusLabel, getStatusColor, getCycleLabel } from "@/utils/campaignUtils";

interface Campaign {
  id: string;
  campaign_type: string;
  status: string;
  start_date: string | null;
  next_send: string | null;
  cycle_type: string | null;
  attempts_total: number | null;
  attempt_current: number | null;
}

interface CampaignSchedulerProps {
  campaign: Campaign;
  onUpdate: () => void;
}

export const CampaignScheduler = ({ campaign, onUpdate }: CampaignSchedulerProps) => {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [cycleType, setCycleType] = useState<'weekly' | 'biweekly'>('weekly');
  const [attemptsTotal, setAttemptsTotal] = useState(3);
  const [scheduling, setScheduling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const isAutomatic = campaign.campaign_type === 'automatic';
  const isScheduled = ['scheduled', 'live'].includes(campaign.status);

  const getNextSendDates = () => {
    if (!startDate || !startTime) return [];
    const dateTime = new Date(`${startDate}T${startTime}`);
    return calculateNextSendDates(dateTime, cycleType, attemptsTotal);
  };

  const handleSchedule = async () => {
    if (!startDate || !startTime) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a data e hora do primeiro envio",
        variant: "destructive",
      });
      return;
    }

    setScheduling(true);
    try {
      // Normalize to start of hour (00 minutes, 00 seconds)
      const dateTime = new Date(`${startDate}T${startTime}:00`);
      dateTime.setMinutes(0);
      dateTime.setSeconds(0);
      dateTime.setMilliseconds(0);
      
      const utcDateTime = fromBrazilTime(dateTime);

      const { error } = await supabase
        .from("campaigns")
        .update({
          campaign_type: 'automatic',
          start_date: utcDateTime.toISOString(),
          cycle_type: cycleType,
          attempts_total: attemptsTotal,
          attempt_current: 0,
          next_send: utcDateTime.toISOString(),
          status: 'scheduled',
        })
        .eq("id", campaign.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Campanha agendada com sucesso.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScheduling(false);
    }
  };

  const handlePause = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: 'paused' })
        .eq("id", campaign.id);

      if (error) throw error;

      toast({
        title: "Campanha pausada",
        description: "Os envios automáticos foram pausados.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleResume = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: 'live' })
        .eq("id", campaign.id);

      if (error) throw error;

      toast({
        title: "Campanha retomada",
        description: "Os envios automáticos foram retomados.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const nextDates = getNextSendDates();

  if (isAutomatic && isScheduled) {
    return (
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Agendamento Automático
            </h3>
            <div className={`inline-block px-3 py-1 rounded-full text-sm ${getStatusColor(campaign.status)}`}>
              {getStatusLabel(campaign.status)}
            </div>
          </div>
          {campaign.status === 'live' ? (
            <Button onClick={handlePause} disabled={updating} variant="outline" size="sm">
              <Pause className="mr-2 h-4 w-4" />
              {updating ? "Pausando..." : "Pausar"}
            </Button>
          ) : campaign.status === 'paused' ? (
            <Button onClick={handleResume} disabled={updating} size="sm">
              <Play className="mr-2 h-4 w-4" />
              {updating ? "Retomando..." : "Retomar"}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ciclo</p>
            <p className="font-medium">{getCycleLabel(campaign.cycle_type)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Tentativas</p>
            <p className="font-medium">{campaign.attempt_current} / {campaign.attempts_total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Primeiro Envio</p>
            <p className="font-medium">{campaign.start_date ? formatDate(campaign.start_date) : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Próximo Envio</p>
            <p className="font-medium">{campaign.next_send ? formatDate(campaign.next_send) : '-'}</p>
          </div>
        </div>

        {campaign.status === 'completed' && (
          <div className="flex items-center gap-2 p-3 bg-success/10 text-success rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Campanha concluída - Todas as tentativas foram realizadas</span>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Configurar Agendamento Automático
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Configure os envios automáticos desta campanha. Os e-mails serão enviados para todos os contatos da lista nos horários programados.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data do Primeiro Envio
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hora do Envio (Horário de Brasília)
            </Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a hora" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Ciclo de Envio</Label>
          <Select value={cycleType} onValueChange={(v) => setCycleType(v as 'weekly' | 'biweekly')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal (a cada 7 dias)</SelectItem>
              <SelectItem value="biweekly">Quinzenal (a cada 15 dias)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Número de Tentativas</Label>
          <Select value={attemptsTotal.toString()} onValueChange={(v) => setAttemptsTotal(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'tentativa' : 'tentativas'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {nextDates.length > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm font-medium mb-2">Previsão dos Próximos Envios:</p>
            <ul className="space-y-1">
              {nextDates.map((date, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {index + 1}ª tentativa: {formatDate(date)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={handleSchedule} disabled={scheduling} className="w-full">
          <Calendar className="mr-2 h-4 w-4" />
          {scheduling ? "Agendando..." : "Agendar Envios Automáticos"}
        </Button>
      </div>
    </Card>
  );
};
