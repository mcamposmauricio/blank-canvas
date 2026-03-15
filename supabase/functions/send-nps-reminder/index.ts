import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Gmail API configuration
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");

// Function to get access token from refresh token
async function getAccessToken(): Promise<string> {
  console.log("Getting Gmail access token...");
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error getting access token:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  console.log("Access token obtained successfully");
  return data.access_token;
}

// Function to create email in RFC 2822 format and encode to base64url
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
  
  // Convert to base64url format (replace + with -, / with _, remove = padding)
  const base64 = btoa(unescape(encodeURIComponent(email)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Function to send email via Gmail API
async function sendGmailEmail(to: string, subject: string, htmlBody: string): Promise<string> {
  console.log(`Sending email via Gmail API to: ${to}`);
  
  const accessToken = await getAccessToken();
  const encodedMessage = createEmailMessage(to, subject, htmlBody);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  const data = await response.json();
  console.log("Email sent successfully. Message ID:", data.id);
  return data.id;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NPSReminderRequest {
  contactName: string;
  contactEmail: string;
  campaignName: string;
  campaignMessage: string;
  npsLink: string;
  companyName?: string;
  language?: "en" | "pt-BR";
}

const translations = {
  en: {
    greeting: "Hello",
    wave: "👋",
    importantFeedback: "Your opinion is very important!",
    takesOneMinute: "It takes only 1 minute to respond and helps us improve.",
    respondSurvey: "Respond to Survey →",
    copyLink: "Or copy and paste this link in your browser:",
    autoEmail: "This is an automated email sent by",
    questions: "If you have questions, contact us.",
    allRightsReserved: "All rights reserved",
    surveyTitle: "Satisfaction Survey",
    reminder: "Reminder:",
  },
  "pt-BR": {
    greeting: "Olá",
    wave: "👋",
    importantFeedback: "💡 Sua opinião é muito importante!",
    takesOneMinute: "Leva apenas 1 minuto para responder e nos ajuda a melhorar cada vez mais.",
    respondSurvey: "Responder Pesquisa →",
    copyLink: "Ou copie e cole este link no seu navegador:",
    autoEmail: "Este é um e-mail automático enviado por",
    questions: "Se você tiver dúvidas, entre em contato conosco.",
    allRightsReserved: "Todos os direitos reservados",
    surveyTitle: "Pesquisa de Satisfação",
    reminder: "Lembrete:",
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contactName, 
      contactEmail, 
      campaignName, 
      campaignMessage, 
      npsLink, 
      companyName,
      language = "en"
    }: NPSReminderRequest = await req.json();

    console.log("Sending NPS reminder to:", contactEmail, "in language:", language);

    const t = translations[language] || translations.en;
    const lang = language === "pt-BR" ? "pt-BR" : "en";

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${campaignName}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 40px 40px 30px;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600; text-align: center;">
                      ${companyName || t.surveyTitle}
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px; font-weight: 600;">
                      ${t.greeting}, ${contactName}! ${t.wave}
                    </h2>
                    
                    <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      ${campaignMessage}
                    </p>
                    
                    <div style="background-color: #f8fafc; border-left: 4px solid #8B5CF6; padding: 16px; margin: 24px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #1a1a1a; font-size: 15px; line-height: 1.5;">
                        <strong>${t.importantFeedback}</strong><br/>
                        ${t.takesOneMinute}
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${npsLink}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                            ${t.respondSurvey}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 1.5; text-align: center;">
                      ${t.copyLink}<br/>
                      <a href="${npsLink}" style="color: #8B5CF6; text-decoration: none; word-break: break-all;">${npsLink}</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #a0aec0; font-size: 13px; line-height: 1.6; text-align: center;">
                      ${t.autoEmail} <strong>${companyName || t.surveyTitle}</strong>.<br/>
                      ${t.questions}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Email Footer -->
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                <tr>
                  <td style="text-align: center; padding: 20px;">
                    <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                      © ${new Date().getFullYear()} ${companyName || t.allRightsReserved}
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

    const messageId = await sendGmailEmail(
      contactEmail,
      `${t.reminder} ${campaignName}`,
      htmlBody
    );

    console.log("Email sent successfully. Message ID:", messageId);

    return new Response(JSON.stringify({ success: true, messageId }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-nps-reminder function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
