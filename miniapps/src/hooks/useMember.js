import { useState, useEffect, useCallback } from 'react';
import supabase from '../supabase';

// ─────────────────────────────────────────────
// useMember — manages the current member's data
// Registers on first visit, subscribes to
// real-time point updates
// ─────────────────────────────────────────────
export function useMember(tgUser) {
  const [member,  setMember]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchOrCreate = useCallback(async () => {
    if (!tgUser) return;
    try {
      setLoading(true);

      // Try to fetch existing member
      const { data: existing } = await supabase
        .from('members')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .single();

      if (existing) {
        setMember(existing);
        // Update last_active silently
        supabase.from('members')
          .update({ last_active: new Date().toISOString() })
          .eq('id', existing.id);
        return;
      }

      // Generate referral code via bot API
      // (member should already exist from /start — this is a safety net)
      const code = `CROI_${Math.random().toString(36).substring(2,8).toUpperCase()}`;

      const { data: newMember, error: insertErr } = await supabase
        .from('members')
        .insert({
          telegram_id:       tgUser.id,
          telegram_username: tgUser.username  || null,
          first_name:        tgUser.first_name || 'Member',
          last_name:         tgUser.last_name  || null,
          referral_code:     code,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      setMember(newMember);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tgUser]);

  // Initial fetch
  useEffect(() => { fetchOrCreate(); }, [fetchOrCreate]);

  // Real-time subscription to own member record
  useEffect(() => {
    if (!member?.id) return;

    const channel = supabase
      .channel(`member-${member.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'members', filter: `id=eq.${member.id}` },
        (payload) => {
          setMember(prev => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [member?.id]);

  return { member, loading, error, refetch: fetchOrCreate };
}