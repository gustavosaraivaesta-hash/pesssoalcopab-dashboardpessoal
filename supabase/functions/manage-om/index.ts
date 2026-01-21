import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        JSON.stringify({ error: 'Unauthorized - Only COPAB admins can manage OMs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, om, password, userId, additionalOms } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle additional OMs management
    if (action === 'add-additional-om') {
      if (!userId || !om) {
        return new Response(
          JSON.stringify({ error: 'userId and om are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: insertError } = await adminClient
        .from('user_additional_oms')
        .insert({ user_id: userId, om: om.toUpperCase() });

      if (insertError) {
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ error: `OM ${om} já está atribuída a este usuário` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: `Failed to add OM: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Added additional OM ${om} to user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, message: `OM ${om} adicionada com sucesso` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'remove-additional-om') {
      if (!userId || !om) {
        return new Response(
          JSON.stringify({ error: 'userId and om are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await adminClient
        .from('user_additional_oms')
        .delete()
        .eq('user_id', userId)
        .eq('om', om.toUpperCase());

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Failed to remove OM: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Removed additional OM ${om} from user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, message: `OM ${om} removida com sucesso` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'get-additional-oms') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: oms, error: fetchError } = await adminClient
        .from('user_additional_oms')
        .select('om')
        .eq('user_id', userId);

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch OMs: ${fetchError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, additionalOms: oms?.map(o => o.om) || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'set-additional-oms') {
      if (!userId || !Array.isArray(additionalOms)) {
        return new Response(
          JSON.stringify({ error: 'userId and additionalOms array are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete all existing additional OMs for this user
      await adminClient
        .from('user_additional_oms')
        .delete()
        .eq('user_id', userId);

      // Insert new additional OMs
      if (additionalOms.length > 0) {
        const { error: insertError } = await adminClient
          .from('user_additional_oms')
          .insert(additionalOms.map(om => ({ user_id: userId, om: om.toUpperCase() })));

        if (insertError) {
          return new Response(
            JSON.stringify({ error: `Failed to set OMs: ${insertError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log(`Set additional OMs for user ${userId}: ${additionalOms.join(', ')}`);
      return new Response(
        JSON.stringify({ success: true, message: `OMs adicionais atualizadas com sucesso` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Original actions that require om parameter
    if (!action || !om) {
      return new Response(
        JSON.stringify({ error: 'Action and OM are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = `${om.toLowerCase().replace(/[^a-z0-9-]/g, '')}@copab.marinha.mil.br`;
    const defaultPassword = password || `${om.toUpperCase()}01`;

    if (action === 'create') {
      // Validate password length
      if (defaultPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: `OM ${om} already exists` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newUser?.user) {
        // Note: Role will need to be added to enum first via migration
        // For now, we just create the user. Role assignment will happen after enum update.
        console.log(`Created user for new OM: ${om} with email: ${email}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          om, 
          email,
          message: `OM ${om} created successfully. Note: Role assignment requires a database migration to add the new role to the enum.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'delete') {
      // Find user by email
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      if (!existingUser) {
        return new Response(
          JSON.stringify({ error: `OM ${om} not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete additional OMs first
      await adminClient
        .from('user_additional_oms')
        .delete()
        .eq('user_id', existingUser.id);

      // Delete role
      await adminClient
        .from('user_roles')
        .delete()
        .eq('user_id', existingUser.id);

      // Delete user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(existingUser.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Deleted user for OM: ${om}`);

      return new Response(
        JSON.stringify({ success: true, om, message: `OM ${om} deleted successfully` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'list') {
      // List all OM users with their additional OMs
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const omUsersList = existingUsers?.users?.filter(u => 
        u.email?.endsWith('@copab.marinha.mil.br')
      ) || [];

      // Get additional OMs for all users
      const { data: allAdditionalOms } = await adminClient
        .from('user_additional_oms')
        .select('user_id, om');

      const additionalOmsMap = new Map<string, string[]>();
      allAdditionalOms?.forEach(item => {
        const existing = additionalOmsMap.get(item.user_id) || [];
        existing.push(item.om);
        additionalOmsMap.set(item.user_id, existing);
      });

      const omUsers = omUsersList.map(u => ({
        id: u.id,
        email: u.email,
        om: u.email?.split('@')[0].toUpperCase(),
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        additional_oms: additionalOmsMap.get(u.id) || [],
      }));

      return new Response(
        JSON.stringify({ success: true, users: omUsers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: create, delete, list, add-additional-om, remove-additional-om, get-additional-oms, set-additional-oms' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error managing OM:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});