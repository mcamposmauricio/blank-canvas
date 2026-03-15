import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { api_key, token, score, comment } = await req.json();

    if (!api_key || !token || score === undefined) {
      return new Response(
        JSON.stringify({ error: 'api_key, token, and score are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate score
    const numScore = parseInt(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      return new Response(
        JSON.stringify({ error: 'Score must be between 0 and 10' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate API key
    const keyPrefix = api_key.substring(0, 12);
    
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, user_id, key_hash, is_active')
      .eq('key_prefix', keyPrefix)
      .eq('is_active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify full key hash
    const encoder = new TextEncoder();
    const data = encoder.encode(api_key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (keyHash !== apiKeyData.key_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Find campaign_contact by token
    const { data: campaignContact, error: ccError } = await supabase
      .from('campaign_contacts')
      .select('id, campaign_id, contact_id, company_contact_id, response_channel')
      .eq('link_token', token)
      .maybeSingle();

    if (ccError || !campaignContact) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if already responded
    if (campaignContact.response_channel) {
      return new Response(
        JSON.stringify({ success: false, error: 'Already responded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check for existing response
    const { data: existingResponse } = await supabase
      .from('responses')
      .select('id')
      .eq('campaign_id', campaignContact.campaign_id)
      .eq('contact_id', campaignContact.contact_id)
      .maybeSingle();

    if (existingResponse) {
      return new Response(
        JSON.stringify({ success: false, error: 'Already responded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Insert response
    const { error: responseError } = await supabase
      .from('responses')
      .insert({
        campaign_id: campaignContact.campaign_id,
        contact_id: campaignContact.contact_id,
        score: numScore,
        comment: comment || null,
        token: token,
        responded_at: new Date().toISOString()
      });

    if (responseError) {
      console.error('Error inserting response:', responseError);
      throw responseError;
    }

    // Update campaign_contact with response channel
    await supabase
      .from('campaign_contacts')
      .update({ response_channel: 'embedded' })
      .eq('id', campaignContact.id);

    // Trigger response notification if configured
    try {
      await supabase.functions.invoke('send-response-notification', {
        body: {
          campaignId: campaignContact.campaign_id,
          contactId: campaignContact.contact_id,
          score: numScore,
          comment: comment
        }
      });
    } catch (notifError) {
      console.log('Notification not sent (non-critical):', notifError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Response recorded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in submit-embedded-response:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
