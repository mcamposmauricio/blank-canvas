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

    const { api_key, external_id } = await req.json();

    if (!api_key || !external_id) {
      return new Response(
        JSON.stringify({ error: 'api_key and external_id are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate API key - get key prefix and find matching key
    const keyPrefix = api_key.substring(0, 12);
    
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, user_id, key_hash, is_active')
      .eq('key_prefix', keyPrefix)
      .eq('is_active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      console.error('API key validation failed:', apiKeyError);
      return new Response(
        JSON.stringify({ has_pending: false, reason: 'invalid_api_key' }),
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
        JSON.stringify({ has_pending: false, reason: 'invalid_api_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userId = apiKeyData.user_id;

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Find company_contact (person) by external_id for this user
    const { data: companyContact, error: contactError } = await supabase
      .from('company_contacts')
      .select('id, name, email, company_id')
      .eq('user_id', userId)
      .eq('external_id', external_id)
      .maybeSingle();

    if (contactError || !companyContact) {
      console.log('Company contact not found for external_id:', external_id);
      return new Response(
        JSON.stringify({ has_pending: false, reason: 'invalid_external_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get the company (contact) this person belongs to
    const companyId = companyContact.company_id;

    // Find pending campaign_contacts for embedded campaigns where the COMPANY is included
    const { data: pendingCampaigns, error: pendingError } = await supabase
      .from('campaign_contacts')
      .select(`
        id,
        link_token,
        campaign_id,
        contact_id,
        company_contact_id,
        campaigns!inner (
          id,
          name,
          message,
          status,
          send_channels,
          brand_settings_id,
          brand_settings (
            company_name,
            brand_name,
            logo_url,
            primary_color,
            secondary_color,
            accent_color
          )
        )
      `)
      .eq('contact_id', companyId)
      .is('response_channel', null);

    if (pendingError) {
      console.error('Error fetching pending campaigns:', pendingError);
      throw pendingError;
    }

    // Filter for live campaigns with embedded channel
    const eligibleCampaign = pendingCampaigns?.find((pc: any) => {
      const campaign = pc.campaigns;
      return campaign.status === 'live' && 
             campaign.send_channels && 
             campaign.send_channels.includes('embedded');
    });

    if (!eligibleCampaign) {
      // Check if company already responded
      const { data: existingResponse } = await supabase
        .from('responses')
        .select('id')
        .eq('contact_id', companyId)
        .limit(1);

      if (existingResponse && existingResponse.length > 0) {
        return new Response(
          JSON.stringify({ has_pending: false, reason: 'already_responded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({ has_pending: false, reason: 'no_pending_campaign' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Mark as viewed and update with company_contact_id if not set
    const updateData: any = {
      embedded_viewed: true,
      embedded_viewed_at: new Date().toISOString()
    };
    
    // Link the company_contact to this campaign_contact if not already linked
    if (!eligibleCampaign.company_contact_id) {
      updateData.company_contact_id = companyContact.id;
    }

    await supabase
      .from('campaign_contacts')
      .update(updateData)
      .eq('id', eligibleCampaign.id);

    const campaign = eligibleCampaign.campaigns as any;
    const brandSettings = campaign.brand_settings;

    // Return the person's name (not company name) for personalized greeting
    return new Response(
      JSON.stringify({
        has_pending: true,
        campaign_id: campaign.id,
        token: eligibleCampaign.link_token,
        contact_name: companyContact.name, // Person's name for personalized greeting
        message: campaign.message,
        brand_settings: brandSettings ? {
          company_name: brandSettings.company_name || brandSettings.brand_name,
          brand_name: brandSettings.brand_name,
          logo_url: brandSettings.logo_url,
          primary_color: brandSettings.primary_color,
          secondary_color: brandSettings.secondary_color,
          accent_color: brandSettings.accent_color
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in check-nps-pending:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
