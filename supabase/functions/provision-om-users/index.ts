import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All OMs that need user accounts
const OMS_TO_PROVISION = [
  "BAMRJ",
  "CMM",
  "DEPCMRJ",
  "CDAM",
  "DEPSMRJ",
  "DEPSIMRJ",
  "DEPMSMRJ",
  "DEPFMRJ",
  "CDU-BAMRJ",
  "CDU-1DN",
];

// Helper function to authenticate request and check if user is COPAB admin
async function authenticateAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  
  if (error || !data?.claims) {
    return false;
  }

  const userId = data.claims.sub as string;

  // Check if user has COPAB role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return roleData?.role === 'COPAB';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if request is from an admin
    const isAdmin = await authenticateAdmin(req);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Only COPAB admins can provision users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to create users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const results: { om: string; status: string; error?: string }[] = [];

    for (const om of OMS_TO_PROVISION) {
      const email = `${om.toLowerCase()}@copab.marinha.mil.br`;
      const password = `${om.toUpperCase()}01`;

      try {
        // Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        if (existingUser) {
          // Update password if user exists
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            existingUser.id,
            { password }
          );

          if (updateError) {
            results.push({ om, status: 'error', error: `Failed to update: ${updateError.message}` });
            continue;
          }

          // Check if role exists
          const { data: roleData } = await adminClient
            .from('user_roles')
            .select('id')
            .eq('user_id', existingUser.id)
            .single();

          if (!roleData) {
            // Add role
            await adminClient
              .from('user_roles')
              .insert({ user_id: existingUser.id, role: om });
          }

          results.push({ om, status: 'updated' });
        } else {
          // Create new user
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

          if (createError) {
            results.push({ om, status: 'error', error: `Failed to create: ${createError.message}` });
            continue;
          }

          if (newUser?.user) {
            // Add role
            const { error: roleError } = await adminClient
              .from('user_roles')
              .insert({ user_id: newUser.user.id, role: om });

            if (roleError) {
              results.push({ om, status: 'created_no_role', error: `User created but role failed: ${roleError.message}` });
            } else {
              results.push({ om, status: 'created' });
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ om, status: 'error', error: errorMessage });
      }
    }

    console.log('Provisioning results:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          created: results.filter(r => r.status === 'created').length,
          updated: results.filter(r => r.status === 'updated').length,
          errors: results.filter(r => r.status === 'error').length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error provisioning users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});