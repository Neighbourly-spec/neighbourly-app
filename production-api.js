/* Neighbourly production transport boundary.
   Only the Supabase project URL + publishable key are public here. Never place service-role,
   payment secrets, KYC secrets, raw identity data, passwords or OTPs in this file. */
(() => {
  const SUPABASE_URL = 'https://kgsfuyzieijmyfdsnqxc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qnAEZRGp8zYbLYnQ1MGKYQ_FdRQpANN';
  const client = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) ?? null;

  async function requireSession() {
    if (!client) throw new Error('production-backend-not-configured');
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) throw new Error('not-authenticated');
    return data.session;
  }

  async function getMyProfile(userId) {
    const session = await requireSession();
    const id = userId || session.user.id;
    if (id !== session.user.id) throw new Error('profile-id-mismatch');
    const { data: profile, error } = await client.from('profiles')
      .select('user_id,role,first_name,last_name,mobile_e164,area,age_gate_passed,identity_status,account_status')
      .eq('user_id', id).single();
    if (error) throw error;
    let provider = null;
    if (profile.role === 'provider') {
      const { data, error: providerError } = await client.from('provider_profiles')
        .select('provider_code,category,service_name,about,price_from_cents,areas,availability,approval_status,credential_status,category_status,onboarding_passed,membership_tier,boosts_balance,hidden_from_search,pricing_mode')
        .eq('user_id', id).single();
      if (providerError) throw providerError;
      provider = data;
    }
    return { profile, provider, email: session.user.email ?? '' };
  }

  window.NeighbourlyAPI = {
    configured: !!client,
    client,
    async signUp({ role, firstName, lastName, email, mobileE164, area, password }) {
      if (!client) throw new Error('production-backend-not-configured');
      if (!['customer', 'provider'].includes(role)) throw new Error('invalid-role');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: {
          neighbourly_role: role,
          first_name: firstName,
          last_name: lastName,
          mobile_e164: mobileE164,
          area,
          age_gate_passed: true
        }}
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },
    async signIn({ email, password }) {
      if (!client) throw new Error('production-backend-not-configured');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const account = await getMyProfile(data.user.id);
      return { ...data, account };
    },
    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut({ scope: 'global' });
      if (error) throw error;
    },
    async getSession() {
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    getMyProfile,
    onAuthStateChange(callback) {
      if (!client) return { data: { subscription: { unsubscribe(){} } } };
      return client.auth.onAuthStateChange(callback);
    },
    async createSupportCase({ reason, details, orderId = null, targetUserId = null }) {
      const session = await requireSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/support-case`, {
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({reason,details,order_id:orderId,target_user_id:targetUserId})
      });
      const payload=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(payload?.error||`support-case-${res.status}`);
      return payload;
    },
    async createEmergencyCase({ orderId, action }) {
      const session = await requireSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/emergency-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ order_id: orderId, action })
      });
      if (!res.ok) throw new Error(`emergency-case-${res.status}`);
      return res.json();
    },
    async listMessages(orderId) {
      await requireSession();
      const { data, error } = await client.from('messages')
        .select('id,order_id,sender_id,body,created_at,read_at')
        .eq('order_id', orderId).order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    async sendMessage(orderId, body) {
      const session = await requireSession();
      const clean = String(body ?? '').trim();
      if (!clean || clean.length > 2000) throw new Error('invalid-message');
      const { data, error } = await client.from('messages')
        .insert({ order_id: orderId, sender_id: session.user.id, body: clean })
        .select('id,order_id,sender_id,body,created_at,read_at').single();
      if (error) throw error;
      return data;
    },
    subscribeMessages(orderId, callback) {
      if (!client) return null;
      return client.channel(`messages:${orderId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, payload => callback(payload.new))
        .subscribe();
    },
    unsubscribe(channel) {
      if (client && channel) client.removeChannel(channel);
    },
    async createOrder({ providerUserId, serviceName, scope, serviceAddress, scheduledAt, priceItemId = null }) {
      const session = await requireSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-order`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', apikey:SUPABASE_PUBLISHABLE_KEY, Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({
          provider_id: providerUserId,
          service_name: String(serviceName ?? '').trim(),
          scope: String(scope ?? '').trim(),
          service_address: String(serviceAddress ?? '').trim(),
          scheduled_at: scheduledAt,
          price_item_id: priceItemId || null
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `create-order-${res.status}`);
      return payload;
    },
    async listOrders() {
      await requireSession();
      const { data, error } = await client.from('service_orders')
        .select('id,customer_id,provider_id,status,service_name,scope,scheduled_at,base_price_cents,price_item_id,pricing_mode_at_booking,price_proposed_at,price_confirmed_at,price_proposed_by,customer_display_name,customer_area,provider_display_name,provider_code,provider_marked_done_at,customer_confirmed_at,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    async listOrderLocations() {
      await requireSession();
      const { data, error } = await client.from('service_locations').select('order_id,service_address');
      if (error) throw error;
      return data ?? [];
    },
    async serviceAction({ orderId, action, extraWorkId = null, reason = null, basePriceCents = null, addedCostCents = null, timingNote = null }) {
      const session = await requireSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/service-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ order_id: orderId, action, extra_work_id: extraWorkId, reason, base_price_cents: Number.isInteger(basePriceCents) ? basePriceCents : null, added_cost_cents: Number.isInteger(addedCostCents) ? addedCostCents : null, timing_note: timingNote })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `service-action-${res.status}`);
      return payload;
    },
    async proposeExtraWork({ orderId, description, addedCostCents = null }) {
      const session = await requireSession();
      const clean = String(description ?? '').trim();
      if (!clean) throw new Error('invalid-extra-work');
      const { data, error } = await client.from('extra_work').insert({
        order_id: orderId,
        proposed_by: session.user.id,
        description: clean,
        added_cost_cents: Number.isInteger(addedCostCents) ? addedCostCents : null
      }).select('id,order_id,proposed_by,description,added_cost_cents,status,created_at').single();
      if (error) throw error;
      return data;
    },

    async listExtraWork(orderIds = []) {
      await requireSession();
      if (!Array.isArray(orderIds) || !orderIds.length) return [];
      const { data, error } = await client.from('extra_work')
        .select('id,order_id,proposed_by,description,added_cost_cents,status,accepted_by,accepted_at,created_at')
        .in('order_id', orderIds).order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    async listApprovedProviders() {
      await requireSession();
      const { data, error } = await client.from('provider_profiles')
        .select('user_id,provider_code,display_name,primary_area,category,service_name,about,price_from_cents,areas,availability,approval_status,onboarding_passed,membership_tier,hidden_from_search,pricing_mode')
        .eq('approval_status', 'approved')
        .eq('hidden_from_search', false)
        .eq('onboarding_passed', true)
        .order('display_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    async discoverProviders({ service, area, limit = 20 } = {}) {
      const session = await requireSession();
      const qs = new URLSearchParams({ service: String(service || '').trim(), area: String(area || '').trim(), limit: String(limit) });
      const res = await fetch(`${SUPABASE_URL}/functions/v1/provider-discovery?${qs}`, { headers:{ apikey:SUPABASE_PUBLISHABLE_KEY, Authorization:`Bearer ${session.access_token}` } });
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`provider-discovery-${res.status}`); return payload;
    },
    async getMyBoostState() {
      const session = await requireSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/provider-boost`, { headers:{ apikey:SUPABASE_PUBLISHABLE_KEY, Authorization:`Bearer ${session.access_token}` } });
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`provider-boost-${res.status}`); return payload;
    },
    async activateBoost({ serviceName, area }) {
      const session = await requireSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/provider-boost`, { method:'POST', headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}, body:JSON.stringify({action:'activate',service_name:String(serviceName||'').trim(),area:String(area||'').trim()}) });
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`provider-boost-${res.status}`); return payload;
    },
    async listProviderPriceItems(providerUserIds = []) {
      await requireSession();
      let q = client.from('provider_price_items').select('id,provider_id,name,description,price_cents,active,sort_order').eq('active', true).order('sort_order').order('name');
      if (Array.isArray(providerUserIds) && providerUserIds.length) q = q.in('provider_id', providerUserIds);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    async getMyMedia() {
      const session = await requireSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/media-manage`, { headers:{ apikey:SUPABASE_PUBLISHABLE_KEY, Authorization:`Bearer ${session.access_token}` } });
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`media-manage-${res.status}`); return payload;
    },
    async uploadProfilePhoto(file, photoType = null) {
      const session = await requireSession(); const form=new FormData(); form.append('file',file); if(photoType) form.append('photo_type',photoType);
      const res=await fetch(`${SUPABASE_URL}/functions/v1/profile-media?mode=upload_profile`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},body:form});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`profile-media-${res.status}`); return payload;
    },
    async uploadPortfolioImage(file,{caption='',background='unknown'}={}) {
      const session=await requireSession(); const form=new FormData(); form.append('file',file); form.append('caption',caption); form.append('background',background);
      const res=await fetch(`${SUPABASE_URL}/functions/v1/profile-media?mode=upload_portfolio`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},body:form});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`profile-media-${res.status}`); return payload;
    },
    async manageMedia({action,mediaType,id}) {
      const session=await requireSession(); const res=await fetch(`${SUPABASE_URL}/functions/v1/media-manage`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,media_type:mediaType,id})});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`media-manage-${res.status}`); return payload;
    },
    async getProviderGallery(providerUserId) {
      const session=await requireSession(); const res=await fetch(`${SUPABASE_URL}/functions/v1/profile-media?mode=gallery&provider_id=${encodeURIComponent(providerUserId)}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`profile-media-${res.status}`); return payload;
    },
    async listPendingMedia() {
      const session=await requireSession(); const res=await fetch(`${SUPABASE_URL}/functions/v1/sisters-media-queue`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`sisters-media-queue-${res.status}`); return payload.items??[];
    },
    async reviewMedia({mediaType,id,decision,note=''}) {
      const session=await requireSession(); const res=await fetch(`${SUPABASE_URL}/functions/v1/profile-media?mode=review`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({media_type:mediaType,id,decision,note})});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`profile-media-review-${res.status}`); return payload;
    },
    async adminReporting({from=null,to=null}={}) {
      const session=await requireSession(); const qs=new URLSearchParams(); if(from)qs.set('from',from); if(to)qs.set('to',to); const res=await fetch(`${SUPABASE_URL}/functions/v1/admin-reporting?${qs}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`admin-reporting-${res.status}`); return payload;
    },
    async adminRecords({view='orders',from=null,to=null,q='',limit=50,offset=0}={}) {
      const session=await requireSession(); const qs=new URLSearchParams({view:String(view),limit:String(limit),offset:String(offset)}); if(from)qs.set('from',from); if(to)qs.set('to',to); if(q)qs.set('q',q); const res=await fetch(`${SUPABASE_URL}/functions/v1/admin-records?${qs}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`admin-records-${res.status}`); return payload;
    },
    async requestAccountDeletion(reason = '') {
      const session=await requireSession(); const res=await fetch(`${SUPABASE_URL}/functions/v1/account-deletion`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({reason:String(reason||'').trim()})});
      const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(payload?.error||`account-deletion-${res.status}`); return payload;
    },
    subscribeNotifications(userId, callback) {
      if(!client||!userId)return null;
      return client.channel(`notifications:${userId}`)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},payload=>callback(payload.new))
        .subscribe();
    },
    async listMembershipPlans() {
      await requireSession();
      const { data: plans, error: pErr } = await client.from('membership_plans').select('code,name,monthly_price_cents,description,sort_order').eq('active',true).order('sort_order');
      if(pErr) throw pErr;
      const { data: features, error: fErr } = await client.from('membership_plan_features').select('plan_code,feature_code,enabled,value_json').eq('enabled',true);
      if(fErr) throw fErr;
      return (plans??[]).map(plan=>({...plan,features:(features??[]).filter(f=>f.plan_code===plan.code)}));
    },
    async getMyMembership() {
      const session=await requireSession();
      const { data, error } = await client.from('provider_memberships').select('provider_id,plan_code,status,started_at,renews_at,cancelled_at').eq('provider_id',session.user.id).maybeSingle();
      if(error) throw error; return data;
    },
    async listNotifications() {
      await requireSession();
      const { data, error } = await client.from('notifications')
        .select('id,type,title,body,data,read_at,created_at')
        .order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    async markNotificationRead(id) {
      await requireSession();
      const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    }
  };
})();
