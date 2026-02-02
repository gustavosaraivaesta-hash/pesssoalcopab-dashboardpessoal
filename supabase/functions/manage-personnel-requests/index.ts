import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to authenticate request and get user info
async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  // IMPORTANTE (Lovable Cloud com verify_jwt=false): validar o token explicitamente
  const token = authHeader.replace('Bearer ', '').trim();

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  // Get user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return {
    user,
    role: roleData?.role || null,
    isCopab: roleData?.role === 'COPAB',
    supabase
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateUser(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ACTION: Create a new request (any authenticated user)
    if (action === 'create') {
      const { request_type, personnel_data, original_data, justification, target_om } = params;

      if (!request_type || !personnel_data || !justification) {
        return new Response(
          JSON.stringify({ error: 'request_type, personnel_data and justification are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get requesting OM from user role
      const requestingOm = auth.role;
      if (!requestingOm) {
        return new Response(
          JSON.stringify({ error: 'User does not have an assigned OM' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: newRequest, error: insertError } = await adminClient
        .from('personnel_requests')
        .insert({
          request_type,
          personnel_data,
          original_data: original_data || null,
          justification,
          requesting_om: requestingOm,
          target_om: target_om || null,
          requested_by: auth.user.id,
          status: 'PENDENTE'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: `Failed to create request: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Created personnel request ${newRequest.id} by user ${auth.user.id}`);
      return new Response(
        JSON.stringify({ success: true, request: newRequest }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
      );
    }

    // ACTION: List requests
    if (action === 'list') {
      const { status, request_type, om, limit = 50, offset = 0 } = params;

      let query = adminClient
        .from('personnel_requests')
        // IMPORTANTE: evitar count='exact' (pode ser lento e causar timeout quando a tabela cresce)
        .select('*');

      // If not COPAB, only show own requests
      if (!auth.isCopab) {
        query = query.eq('requested_by', auth.user.id);
      } else {
        // COPAB can filter by OM
        if (om) {
          query = query.eq('requesting_om', om);
        }
      }

      if (status) {
        query = query.eq('status', status);
      }
      if (request_type) {
        query = query.eq('request_type', request_type);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: requests, error: listError } = await query;

      if (listError) {
        return new Response(
          JSON.stringify({ error: `Failed to list requests: ${listError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, requests, total: Array.isArray(requests) ? requests.length : 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ACTION: Get single request details
    if (action === 'get') {
      const { id } = params;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Request ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = adminClient
        .from('personnel_requests')
        .select('*')
        .eq('id', id);

      // If not COPAB, only allow viewing own requests
      if (!auth.isCopab) {
        query = query.eq('requested_by', auth.user.id);
      }

      const { data: request, error: getError } = await query.single();

      if (getError) {
        return new Response(
          JSON.stringify({ error: 'Request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, request }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ACTION: Review request (COPAB only)
    if (action === 'review') {
      if (!auth.isCopab) {
        return new Response(
          JSON.stringify({ error: 'Only COPAB can review requests' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { id, decision, review_notes } = params;

      if (!id || !decision) {
        return new Response(
          JSON.stringify({ error: 'Request ID and decision are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['APROVADO', 'REJEITADO'].includes(decision)) {
        return new Response(
          JSON.stringify({ error: 'Decision must be APROVADO or REJEITADO' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the request first
      const { data: existingRequest, error: fetchError } = await adminClient
        .from('personnel_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingRequest) {
        return new Response(
          JSON.stringify({ error: 'Request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the request
      const { data: updatedRequest, error: updateError } = await adminClient
        .from('personnel_requests')
        .update({
          status: decision,
          reviewed_by: auth.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Failed to update request: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If approved, archive the data and trigger sheet sync
      if (decision === 'APROVADO') {
        // Archive original data for ALTERACAO/EXCLUSAO
        if (['ALTERACAO', 'EXCLUSAO'].includes(existingRequest.request_type)) {
          const dataToArchive = existingRequest.request_type === 'ALTERACAO' 
            ? existingRequest.original_data 
            : existingRequest.personnel_data;

          if (dataToArchive) {
            const { error: archiveError } = await adminClient
              .from('personnel_history')
              .insert({
                request_id: id,
                action_type: existingRequest.request_type,
                personnel_data: dataToArchive,
                om: existingRequest.requesting_om,
                archived_by: auth.user.id
              });

            if (archiveError) {
              console.error('Archive error:', archiveError);
            }
          }
        }

        // Trigger Google Sheets sync for approved requests
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-sheets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || ''
            },
            body: JSON.stringify({ action: 'sync', request_id: id })
          });
          
          const syncResult = await syncResponse.json();
          console.log(`Sheet sync result for request ${id}:`, syncResult);
        } catch (syncError) {
          console.error('Sheet sync error:', syncError);
          // Don't fail the approval, just log the sync error
        }
      }

      console.log(`Request ${id} ${decision} by user ${auth.user.id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          request: updatedRequest,
          sheetSyncTriggered: decision === 'APROVADO'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ACTION: Get statistics (COPAB only)
    if (action === 'stats') {
      if (!auth.isCopab) {
        return new Response(
          JSON.stringify({ error: 'Only COPAB can view stats' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Count by status
      const { data: statusCounts, error: statsError } = await adminClient
        .from('personnel_requests')
        .select('status')
        .then(result => {
          if (result.error) throw result.error;
          const counts: Record<string, number> = {
            PENDENTE: 0,
            EM_ANALISE: 0,
            APROVADO: 0,
            REJEITADO: 0
          };
          result.data?.forEach(r => {
            counts[r.status] = (counts[r.status] || 0) + 1;
          });
          return { data: counts, error: null };
        });

      if (statsError) {
        return new Response(
          JSON.stringify({ error: `Failed to get stats: ${statsError}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, stats: statusCounts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ACTION: Get history (for archives)
    if (action === 'history') {
      const { om, limit = 50, offset = 0 } = params;

      let query = adminClient
        .from('personnel_history')
        // IMPORTANTE: evitar count='exact' (pode ser lento e causar timeout quando a tabela cresce)
        .select('*');

      // If not COPAB, only show own OM's history
      if (!auth.isCopab) {
        query = query.eq('om', auth.role);
      } else if (om) {
        query = query.eq('om', om);
      }

      query = query
        .order('archived_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: history, error: historyError } = await query;

      if (historyError) {
        return new Response(
          JSON.stringify({ error: `Failed to get history: ${historyError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, history, total: Array.isArray(history) ? history.length : 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ACTION: Delete request (COPAB only, for processed requests)
    if (action === 'delete') {
      if (!auth.isCopab) {
        return new Response(
          JSON.stringify({ error: 'Only COPAB can delete requests' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { id } = params;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Request ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the request first to check its status
      const { data: existingRequest, error: fetchError } = await adminClient
        .from('personnel_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingRequest) {
        return new Response(
          JSON.stringify({ error: 'Request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Only allow deleting processed requests (APROVADO or REJEITADO)
      if (!['APROVADO', 'REJEITADO'].includes(existingRequest.status)) {
        return new Response(
          JSON.stringify({ error: 'Only processed requests (approved or rejected) can be deleted' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First, delete related records in personnel_history (cascade manually)
      const { error: historyDeleteError } = await adminClient
        .from('personnel_history')
        .delete()
        .eq('request_id', id);

      if (historyDeleteError) {
        console.error('History delete error:', historyDeleteError);
        // Continue anyway - there might be no related history records
      }

      // Delete the request
      const { error: deleteError } = await adminClient
        .from('personnel_requests')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Failed to delete request: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Request ${id} deleted by COPAB user ${auth.user.id}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Request deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: create, list, get, review, stats, history' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error managing personnel request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
