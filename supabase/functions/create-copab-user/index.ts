import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACCOUNT_USERNAMES = ["copab", "copab2", "copab3"];
const LEGACY_PRIMARY_EMAIL = "copab1@copab.marinha.mil.br";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const defaultPassword = Deno.env.get('COPAB_DEFAULT_PASSWORD');
    if (!defaultPassword) throw new Error('COPAB_DEFAULT_PASSWORD is not configured');
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const results: any[] = [];

    for (const username of ACCOUNT_USERNAMES) {
      const email = `${username}@copab.marinha.mil.br`;
      const exactUser = existingUsers?.users?.find((u) => u.email === email);
      const legacyUser = username === "copab"
        ? existingUsers?.users?.find((u) => u.email === LEGACY_PRIMARY_EMAIL)
        : undefined;
      const existingUser = exactUser || legacyUser;

      let userId: string;
      let status: string;

      if (existingUser) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          existingUser.id,
          { email, password: defaultPassword, email_confirm: true }
        );
        if (updateError) throw updateError;
        userId = existingUser.id;
        status = "updated";
      } else {
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
        });
        if (createError) throw createError;
        userId = newUser.user!.id;
        status = "created";
      }

      // Ensure COPAB role
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!roleData) {
        const { error: roleError } = await adminClient
          .from('user_roles')
          .insert({ user_id: userId, role: 'COPAB' });
        if (roleError) throw roleError;
      }

      results.push({ email, status, userId });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
