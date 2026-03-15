import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  responseId: string;
  campaignId: string;
  contactId: string;
  score: number;
  comment?: string;
}

const translations = {
  en: {
    subject: "New NPS Response Received",
    greeting: "Hello!",
    newResponse: "You received a new NPS response",
    campaign: "Campaign",
    contact: "Contact",
    score: "Score",
    comment: "Comment",
    noComment: "No comment provided",
    promoter: "Promoter",
    neutral: "Neutral",
    detractor: "Detractor",
    viewDashboard: "View in Dashboard",
    autoEmail: "This is an automated notification from your NPS system.",
  },
  "pt-BR": {
    subject: "Nova Resposta NPS Recebida",
    greeting: "Olá!",
    newResponse: "Você recebeu uma nova resposta NPS",
    campaign: "Campanha",
    contact: "Contato",
    score: "Nota",
    comment: "Comentário",
    noComment: "Sem comentário",
    promoter: "Promotor",
    neutral: "Neutro",
    detractor: "Detrator",
    viewDashboard: "Ver no Dashboard",
    autoEmail: "Esta é uma notificação automática do seu sistema NPS.",
  },
};

function getResponseType(score: number): "promoter" | "neutral" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "neutral";
  return "detractor";
}

function getScoreColor(score: number): string {
  if (score >= 9) return "#22c55e"; // green
  if (score >= 7) return "#eab308"; // yellow
  return "#ef4444"; // red
}

// Get access token from refresh token for Gmail OAuth
async function getGmailAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
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
    throw new Error(`Failed to get Gmail access token: ${error}`);
  }

  const data = await response.json();
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
    throw new Error(`Failed to send Gmail email: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responseId, campaignId, contactId, score, comment }: NotificationRequest = await req.json();

    console.log("Processing notification for response:", responseId);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get campaign and owner info
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, user_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Get notification settings for the campaign owner
    const { data: notifSettings, error: notifError } = await supabase
      .from("user_notification_settings")
      .select("*")
      .eq("user_id", campaign.user_id)
      .maybeSingle();

    if (notifError) {
      console.error("Error fetching notification settings:", notifError);
      return new Response(
        JSON.stringify({ success: false, message: "Notifications not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if notifications are enabled
    if (!notifSettings?.notify_on_response) {
      console.log("Notifications disabled for user:", campaign.user_id);
      return new Response(
        JSON.stringify({ success: false, message: "Notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check response type filters
    const responseType = getResponseType(score);
    if (responseType === "promoter" && !notifSettings.notify_promoters) {
      console.log("Promoter notifications disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Promoter notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (responseType === "neutral" && !notifSettings.notify_neutrals) {
      console.log("Neutral notifications disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Neutral notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (responseType === "detractor" && !notifSettings.notify_detractors) {
      console.log("Detractor notifications disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Detractor notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get contact info
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("name, email")
      .eq("id", contactId)
      .single();

    if (contactError) {
      console.error("Error fetching contact:", contactError);
    }

    // Get user's auth email if notify_email is not set
    let notifyEmail = notifSettings.notify_email;
    if (!notifyEmail) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(campaign.user_id);
      if (userError || !userData?.user?.email) {
        throw new Error("Could not determine notification email");
      }
      notifyEmail = userData.user.email;
    }

    const t = translations["pt-BR"]; // Default to pt-BR
    const scoreColor = getScoreColor(score);
    const responseTypeLabel = t[responseType];

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="pt-BR">
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
                  <td style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 24px; text-align: center;">
                      📊 ${t.newResponse}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px;">
                    <p style="margin: 0 0 20px; color: #1a1a1a; font-size: 18px;">
                      ${t.greeting}
                    </p>
                    
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #64748b;">${t.campaign}:</strong>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            ${campaign.name}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #64748b;">${t.contact}:</strong>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            ${contact?.name || "N/A"} (${contact?.email || "N/A"})
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <div style="display: inline-block; background-color: ${scoreColor}; color: white; font-size: 48px; font-weight: bold; width: 100px; height: 100px; line-height: 100px; border-radius: 50%;">
                        ${score}
                      </div>
                      <p style="margin: 10px 0 0; color: ${scoreColor}; font-weight: 600; font-size: 16px;">
                        ${responseTypeLabel}
                      </p>
                    </div>

                    ${comment ? `
                      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0 0 8px; color: #92400e; font-weight: 600;">${t.comment}:</p>
                        <p style="margin: 0; color: #78350f; font-style: italic;">"${comment}"</p>
                      </div>
                    ` : `
                      <p style="text-align: center; color: #94a3b8; font-style: italic;">
                        ${t.noComment}
                      </p>
                    `}
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 12px;">
                      ${t.autoEmail}
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

    // Use default Gmail credentials
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN")!;

    const accessToken = await getGmailAccessToken(clientId, clientSecret, refreshToken);
    const messageId = await sendGmailEmail(accessToken, notifyEmail, t.subject, htmlBody);

    console.log("Notification email sent. Message ID:", messageId);

    return new Response(
      JSON.stringify({ success: true, messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-response-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);