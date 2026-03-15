ALTER TABLE public.chat_settings
  ADD COLUMN IF NOT EXISTS show_outside_hours_banner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS outside_hours_title text DEFAULT 'Estamos fora do horário de atendimento.',
  ADD COLUMN IF NOT EXISTS outside_hours_message text DEFAULT 'Sua mensagem ficará registrada e responderemos assim que voltarmos.',
  ADD COLUMN IF NOT EXISTS show_all_busy_banner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS all_busy_title text DEFAULT 'Todos os atendentes estão ocupados no momento.',
  ADD COLUMN IF NOT EXISTS all_busy_message text DEFAULT 'Você está na fila e será atendido em breve. Por favor, aguarde.',
  ADD COLUMN IF NOT EXISTS waiting_message text DEFAULT 'Aguardando atendimento...',
  ADD COLUMN IF NOT EXISTS show_email_field boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone_field boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS form_intro_text text DEFAULT 'Preencha seus dados para iniciar o atendimento.',
  ADD COLUMN IF NOT EXISTS show_chat_history boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_csat boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_file_attachments boolean NOT NULL DEFAULT true;