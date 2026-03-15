import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  provider: "default" | "gmail" | "smtp";
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRefreshToken?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  smtpSecure?: boolean;
  testEmail: string;
  language?: "en" | "pt-BR";
}

const translations = {
  en: {
    subject: "Test Email - Configuration Verified",
    greeting: "Hello!",
    successMessage: "Your email configuration is working correctly.",
    configDetails: "Configuration Details",
    provider: "Provider",
    providerDefault: "System Default",
    providerGmail: "Personal Gmail (OAuth)",
    providerSmtp: "Custom SMTP",
    timestamp: "Sent at",
    footer: "This is a test email from your NPS system.",
  },
  "pt-BR": {
    subject: "E-mail de Teste - Configuração Verificada",
    greeting: "Olá!",
    successMessage: "Sua configuração de e-mail está funcionando corretamente.",
    configDetails: "Detalhes da Configuração",
    provider: "Provedor",
    providerDefault: "Padrão do Sistema",
    providerGmail: "Gmail Pessoal (OAuth)",
    providerSmtp: "SMTP Personalizado",
    timestamp: "Enviado em",
    footer: "Este é um e-mail de teste do seu sistema NPS.",
  },
};

// Get access token from refresh token for Gmail OAuth
async function getGmailAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  console.log("Getting Gmail access token...");
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Gmail OAuth error:", error);
    throw new Error(`Failed to get Gmail access token: ${error}`);
  }

  const data = await response.json();
  console.log("Gmail access token obtained successfully");
  return data.access_token;
}

// Create email in RFC 2822 format and encode to base64url
function createEmailMessage(to: string, subject: string, htmlBody: string): string {
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody,
  ];
  
  const email = emailLines.join("\r\n");
  const base64 = btoa(unescape(encodeURIComponent(email)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send email via Gmail API
async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<string> {
  console.log(`Sending test email via Gmail API to: ${to}`);
  
  const encodedMessage = createEmailMessage(to, subject, htmlBody);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Gmail API error:", error);
    throw new Error(`Failed to send email via Gmail: ${error}`);
  }

  const data = await response.json();
  console.log("Gmail email sent successfully. Message ID:", data.id);
  return data.id;
}

// Send email via SMTP
async function sendSmtpEmail(
  config: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
    secure: boolean;
  },
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  console.log(`Sending test email via SMTP to: ${to}`);
  console.log(`SMTP config: ${config.host}:${config.port}`);

  const client = new SMTPClient({
    connection: {
      hostname: config.host,
      port: config.port,
      tls: config.secure,
      auth: {
        username: config.user,
        password: config.password,
      },
    },
  });

  try {
    await client.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: htmlBody,
    });
    console.log("SMTP email sent successfully");
  } finally {
    await client.close();
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      provider,
      gmailClientId,
      gmailClientSecret,
      gmailRefreshToken,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFromEmail,
      smtpFromName,
      smtpSecure,
      testEmail,
      language = "pt-BR",
    }: TestEmailRequest = await req.json();

    console.log(`Testing email config. Provider: ${provider}, Test email: ${testEmail}`);

    if (!testEmail) {
      throw new Error("Test email address is required");
    }

    const t = translations[language] || translations["pt-BR"];
    const now = new Date().toLocaleString(language === "pt-BR" ? "pt-BR" : "en-US", {
      dateStyle: "full",
      timeStyle: "medium",
    });

    let providerLabel = t.providerDefault;
    if (provider === "gmail") providerLabel = t.providerGmail;
    if (provider === "smtp") providerLabel = t.providerSmtp;

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 24px; text-align: center;">
                      ✅ ${t.subject}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <p style="margin: 0 0 20px; color: #1a1a1a; font-size: 18px;">
                      ${t.greeting}
                    </p>
                    
                    <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #166534; font-size: 16px;">
                        ${t.successMessage}
                      </p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <h3 style="margin: 0 0 16px; color: #1a1a1a; font-size: 16px;">
                        ${t.configDetails}
                      </h3>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                            ${t.provider}:
                          </td>
                          <td style="padding: 8px 0; text-align: right; color: #1a1a1a; font-weight: 500;">
                            ${providerLabel}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                            ${t.timestamp}:
                          </td>
                          <td style="padding: 8px 0; text-align: right; color: #1a1a1a; font-weight: 500;">
                            ${now}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 12px;">
                      ${t.footer}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (provider === "default") {
      // Use system default Gmail credentials
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("System email not configured");
      }

      const accessToken = await getGmailAccessToken(clientId, clientSecret, refreshToken);
      await sendGmailEmail(accessToken, testEmail, t.subject, htmlBody);

    } else if (provider === "gmail") {
      // Use user's Gmail OAuth credentials
      if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken) {
        throw new Error("Gmail OAuth credentials are incomplete");
      }

      const accessToken = await getGmailAccessToken(gmailClientId, gmailClientSecret, gmailRefreshToken);
      await sendGmailEmail(accessToken, testEmail, t.subject, htmlBody);

    } else if (provider === "smtp") {
      // Use user's SMTP credentials
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFromEmail) {
        throw new Error("SMTP configuration is incomplete");
      }

      await sendSmtpEmail(
        {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          password: smtpPassword,
          fromEmail: smtpFromEmail,
          fromName: smtpFromName || "NPS System",
          secure: smtpSecure ?? true,
        },
        testEmail,
        t.subject,
        htmlBody
      );

    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Test email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in test-email-config:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);