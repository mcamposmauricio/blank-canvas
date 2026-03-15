import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCustomFields(cf: unknown): string | null {
  if (cf === undefined || cf === null) return null;
  if (typeof cf !== 'object' || Array.isArray(cf)) return 'custom_fields must be an object';
  const keys = Object.keys(cf as Record<string, unknown>);
  if (keys.length > 10) return 'custom_fields max 10 keys';
  for (const k of keys) {
    if (typeof (cf as Record<string, unknown>)[k] !== 'string') {
      return `custom_fields["${k}"] must be a string`;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Auth: validate import_ API key ---
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing x-api-key header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    if (!apiKey.startsWith('import_')) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const keyPrefix = apiKey.substring(0, 12);
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, user_id, key_hash, is_active')
      .eq('key_prefix', keyPrefix)
      .eq('is_active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    // Verify full key hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (keyHash !== apiKeyData.key_hash) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    // Update last_used_at
    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKeyData.id);

    // Get tenant_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', apiKeyData.user_id)
      .maybeSingle();

    const tenantId = profile?.tenant_id;
    const userId = apiKeyData.user_id;

    // --- Parse body ---
    const body = await req.json();
    const { type, data, skip_duplicates = false, update_existing = false } = body;

    if (!type || !data) {
      return new Response(JSON.stringify({ error: 'type and data are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (type !== 'companies' && type !== 'contacts') {
      return new Response(JSON.stringify({ error: "type must be 'companies' or 'contacts'" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (!Array.isArray(data) || data.length === 0) {
      return new Response(JSON.stringify({ error: 'data must be a non-empty array' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (data.length > 500) {
      return new Response(JSON.stringify({ error: 'Maximum 500 records per request' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const errors: { row: number; email?: string; reason: string }[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    if (type === 'companies') {
      // Fetch existing companies with id for duplicate check and update
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, email, company_document')
        .eq('is_company', true)
        .eq('tenant_id', tenantId);

      const existingEmailMap = new Map<string, string>(); // email -> id
      const existingCnpjMap = new Map<string, string>();  // cnpjDigits -> id

      for (const c of existing || []) {
        existingEmailMap.set(c.email.toLowerCase().trim(), c.id);
        if (c.company_document) {
          existingCnpjMap.set(c.company_document.replace(/\D/g, ''), c.id);
        }
      }

      const BATCH = 50;
      for (let i = 0; i < data.length; i += BATCH) {
        const batch = data.slice(i, i + BATCH);
        const toInsert: any[] = [];

        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const rowIdx = i + j + 1;
          const email = row.nome ? (row.email || '').trim() : '';

          if (!row.nome || !row.nome.trim()) {
            errors.push({ row: rowIdx, email, reason: 'nome is required' });
            continue;
          }
          if (!email || !isValidEmail(email)) {
            errors.push({ row: rowIdx, email, reason: 'Invalid email' });
            continue;
          }

          const cfErr = validateCustomFields(row.custom_fields);
          if (cfErr) {
            errors.push({ row: rowIdx, email, reason: cfErr });
            continue;
          }

          const emailLower = email.toLowerCase();
          const cnpjDigits = row.cnpj ? row.cnpj.replace(/\D/g, '') : '';

          const existingId = existingEmailMap.get(emailLower)
            || (cnpjDigits ? existingCnpjMap.get(cnpjDigits) : null);

          if (existingId) {
            if (update_existing) {
              // Fetch current custom_fields for merge
              const { data: cur } = await supabase
                .from('contacts')
                .select('custom_fields')
                .eq('id', existingId)
                .single();
              const mergedCf = { ...(cur?.custom_fields || {}), ...(row.custom_fields || {}) };

              await supabase.from('contacts').update({
                name: row.nome.trim(),
                phone: row.telefone || null,
                company_document: row.cnpj || null,
                trade_name: row.nome_fantasia || null,
                company_sector: row.setor || null,
                street: row.rua || null,
                street_number: row.numero || null,
                complement: row.complemento || null,
                neighborhood: row.bairro || null,
                city: row.cidade || null,
                state: row.estado || null,
                zip_code: row.cep || null,
                custom_fields: mergedCf,
              }).eq('id', existingId);

              updated++;
            } else if (skip_duplicates) {
              skipped++;
            } else {
              errors.push({ row: rowIdx, email, reason: 'Duplicate email or CNPJ' });
            }
            continue;
          }

          existingEmailMap.set(emailLower, 'pending');
          if (cnpjDigits) existingCnpjMap.set(cnpjDigits, 'pending');

          toInsert.push({
            user_id: userId,
            tenant_id: tenantId,
            is_company: true,
            name: row.nome.trim(),
            email: emailLower,
            phone: row.telefone || null,
            company_document: row.cnpj || null,
            trade_name: row.nome_fantasia || null,
            company_sector: row.setor || null,
            street: row.rua || null,
            street_number: row.numero || null,
            complement: row.complemento || null,
            neighborhood: row.bairro || null,
            city: row.cidade || null,
            state: row.estado || null,
            zip_code: row.cep || null,
            custom_fields: row.custom_fields || {},
          });
        }

        if (toInsert.length > 0) {
          const { error: insertErr } = await supabase.from('contacts').insert(toInsert);
          if (insertErr) {
            console.error('Batch insert error:', insertErr);
            for (const r of toInsert) {
              errors.push({ row: 0, email: r.email, reason: 'Database error: ' + insertErr.message });
            }
          } else {
            imported += toInsert.length;
          }
        }
      }
    } else {
      // contacts
      // Fetch companies for email lookup
      const { data: companies } = await supabase
        .from('contacts')
        .select('id, email')
        .eq('is_company', true)
        .eq('tenant_id', tenantId);

      const companyMap = new Map<string, string>();
      for (const c of companies || []) {
        companyMap.set(c.email.toLowerCase().trim(), c.id);
      }

      // Fetch existing contacts with id for duplicate check and update
      const { data: existingContacts } = await supabase
        .from('company_contacts')
        .select('id, email, company_id')
        .eq('tenant_id', tenantId);

      const existingContactMap = new Map<string, string>(); // "company_id::email" -> id
      for (const c of existingContacts || []) {
        existingContactMap.set(`${c.company_id}::${c.email.toLowerCase().trim()}`, c.id);
      }

      const BATCH = 50;
      for (let i = 0; i < data.length; i += BATCH) {
        const batch = data.slice(i, i + BATCH);
        const toInsert: any[] = [];

        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const rowIdx = i + j + 1;
          const email = (row.email || '').trim();

          if (!row.nome || !row.nome.trim()) {
            errors.push({ row: rowIdx, email, reason: 'nome is required' });
            continue;
          }
          if (!email || !isValidEmail(email)) {
            errors.push({ row: rowIdx, email, reason: 'Invalid email' });
            continue;
          }
          if (!row.empresa_email) {
            errors.push({ row: rowIdx, email, reason: 'empresa_email is required' });
            continue;
          }

          const cfErr = validateCustomFields(row.custom_fields);
          if (cfErr) {
            errors.push({ row: rowIdx, email, reason: cfErr });
            continue;
          }

          const companyId = companyMap.get(row.empresa_email.toLowerCase().trim());
          if (!companyId) {
            errors.push({ row: rowIdx, email, reason: 'Company not found for empresa_email: ' + row.empresa_email });
            continue;
          }

          const dupKey = `${companyId}::${email.toLowerCase()}`;
          const existingContactId = existingContactMap.get(dupKey);

          if (existingContactId) {
            if (update_existing) {
              // Fetch current custom_fields for merge
              const { data: cur } = await supabase
                .from('company_contacts')
                .select('custom_fields')
                .eq('id', existingContactId)
                .single();
              const mergedCf = { ...(cur?.custom_fields || {}), ...(row.custom_fields || {}) };

              await supabase.from('company_contacts').update({
                name: row.nome.trim(),
                phone: row.telefone || null,
                role: row.cargo || null,
                department: row.departamento || null,
                is_primary: row.contato_principal === true,
                external_id: row.external_id || null,
                custom_fields: mergedCf,
              }).eq('id', existingContactId);

              updated++;
            } else if (skip_duplicates) {
              skipped++;
            } else {
              errors.push({ row: rowIdx, email, reason: 'Contact already exists in this company' });
            }
            continue;
          }

          existingContactMap.set(dupKey, 'pending');

          toInsert.push({
            user_id: userId,
            tenant_id: tenantId,
            company_id: companyId,
            name: row.nome.trim(),
            email: email.toLowerCase(),
            phone: row.telefone || null,
            role: row.cargo || null,
            department: row.departamento || null,
            is_primary: row.contato_principal === true,
            external_id: row.external_id || null,
            custom_fields: row.custom_fields || {},
          });
        }

        if (toInsert.length > 0) {
          const { error: insertErr } = await supabase.from('company_contacts').insert(toInsert);
          if (insertErr) {
            console.error('Batch insert error:', insertErr);
            for (const r of toInsert) {
              errors.push({ row: 0, email: r.email, reason: 'Database error: ' + insertErr.message });
            }
          } else {
            imported += toInsert.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: data.length, imported, updated, skipped, errors },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in import-external-data:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
