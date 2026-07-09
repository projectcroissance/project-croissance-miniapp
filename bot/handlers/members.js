const supabase = require('../supabase');

// ─────────────────────────────────────────────
// Get or create a member from Telegram user data
// Called every time someone interacts with the bot
// ─────────────────────────────────────────────
async function getOrCreateMember(tgUser) {
  const { data: existing } = await supabase
    .from('members')
    .select('*')
    .eq('telegram_id', tgUser.id)
    .single();

  if (existing) {
    // Update last active + name in case they changed it
    await supabase
      .from('members')
      .update({
        first_name:        tgUser.first_name || existing.first_name,
        last_name:         tgUser.last_name  || existing.last_name,
        telegram_username: tgUser.username   || existing.telegram_username,
        last_active:       new Date().toISOString(),
      })
      .eq('id', existing.id);

    return existing;
  }

  // Generate unique referral code
  const code = await generateReferralCode(tgUser.id);

  const { data: newMember, error } = await supabase
    .from('members')
    .insert({
      telegram_id:       tgUser.id,
      telegram_username: tgUser.username  || null,
      first_name:        tgUser.first_name || 'Member',
      last_name:         tgUser.last_name  || null,
      photo_url:         null,
      referral_code:     code,
    })
    .select()
    .single();

  if (error) throw error;

  // Award first-join milestone points (+10 CP for introducing)
  // These are awarded when they complete their intro in the group
  // but we log them as potential points here
  console.log(`✅ New member registered: ${tgUser.first_name} (${tgUser.id})`);
  return newMember;
}

// ─────────────────────────────────────────────
// Process a referral when someone joins via a link
// ─────────────────────────────────────────────
async function processReferral(newMemberId, referralCode) {
  if (!referralCode) return;

  // Find the referrer by their code
  const { data: referrer } = await supabase
    .from('members')
    .select('id, first_name, total_points')
    .eq('referral_code', referralCode)
    .single();

  if (!referrer) return;
  if (referrer.id === newMemberId) return; // can't refer yourself

  // Check if referral already exists
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', newMemberId)
    .single();

  if (existing) return;

  // Create referral record
  await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newMemberId,
  });

  // Update the new member's referred_by
  await supabase
    .from('members')
    .update({ referred_by: referrer.id })
    .eq('id', newMemberId);

  console.log(`🔗 Referral logged: member ${newMemberId} referred by ${referrer.id}`);
}

// ─────────────────────────────────────────────
// Award points to a member (wraps the Supabase function)
// ─────────────────────────────────────────────
async function awardPoints(memberId, points, reason, category, referenceId = null, awardedBy = 'system') {
  const { error } = await supabase.rpc('award_points', {
    p_member_id:  memberId,
    p_points:     points,
    p_reason:     reason,
    p_category:   category,
    p_reference:  referenceId,
    p_awarded_by: awardedBy,
  });

  if (error) {
    console.error('Error awarding points:', error);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// Check and activate referrals older than 7 days
// Run by the daily cron job
// ─────────────────────────────────────────────
async function checkReferralActivations() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get unactivated referrals older than 7 days
  const { data: pending } = await supabase
    .from('referrals')
    .select(`
      id,
      referrer_id,
      referred_id,
      joined_at,
      members!referrals_referred_id_fkey (last_active)
    `)
    .eq('active_7_days', false)
    .eq('points_awarded', false)
    .lt('joined_at', sevenDaysAgo);

  if (!pending || pending.length === 0) return;

  for (const ref of pending) {
    const lastActive = ref.members?.last_active;
    const wasActive = lastActive && new Date(lastActive) > new Date(sevenDaysAgo);

    if (wasActive) {
      // Mark referral as active
      await supabase
        .from('referrals')
        .update({ active_7_days: true, points_awarded: true })
        .eq('id', ref.id);

      // Award +10 CP to referrer
      await awardPoints(
        ref.referrer_id,
        10,
        'Referral activated — member stayed 7+ days',
        'referral',
        ref.id
      );

      console.log(`💰 Referral activated: +10 CP to ${ref.referrer_id}`);

      // Check if referrer now has 5 active referrals this month → +25 CP bonus
      await checkReferralBonus(ref.referrer_id);
    }
  }
}

// ─────────────────────────────────────────────
// Award +25 CP if referrer hits 5 referrals in one month
// ─────────────────────────────────────────────
async function checkReferralBonus(referrerId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Count active referrals this month
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact' })
    .eq('referrer_id', referrerId)
    .eq('active_7_days', true)
    .gte('joined_at', startOfMonth.toISOString());

  if (count !== 5) return; // exactly 5 = just hit threshold

  // Check if bonus already awarded this month
  const { data: existing } = await supabase
    .from('point_transactions')
    .select('id')
    .eq('member_id', referrerId)
    .eq('category', 'referral_bonus')
    .gte('created_at', startOfMonth.toISOString())
    .single();

  if (existing) return;

  await awardPoints(
    referrerId,
    25,
    '5 active referrals this month — bonus!',
    'referral_bonus'
  );

  console.log(`🎉 Referral bonus: +25 CP to ${referrerId}`);
}

// ─────────────────────────────────────────────
// Get member full profile with stats
// ─────────────────────────────────────────────
async function getMemberProfile(telegramId) {
  const { data } = await supabase
    .from('member_stats')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  return data;
}

// ─────────────────────────────────────────────
// Get leaderboard (top 50)
// ─────────────────────────────────────────────
async function getLeaderboard(limit = 50) {
  const { data } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(limit);

  return data || [];
}

// ─────────────────────────────────────────────
// Generate unique referral code
// ─────────────────────────────────────────────
async function generateReferralCode(telegramId) {
  const { data } = await supabase.rpc('generate_referral_code', {
    telegram_id: telegramId,
  });
  return data;
}

module.exports = {
  getOrCreateMember,
  processReferral,
  awardPoints,
  checkReferralActivations,
  getMemberProfile,
  getLeaderboard,
};