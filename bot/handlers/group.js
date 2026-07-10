const { getOrCreateMember, awardPoints } = require('./members');
const supabase = require('../supabase');

const MINIAPP_URL = process.env.MINIAPP_URL || 'https://project-croissance-tg-miniapp.vercel.app/';

// ─────────────────────────────────────────────
// Fired when a new member joins the community group
// ─────────────────────────────────────────────
async function handleNewMember(bot, msg) {
  const newUsers = msg.new_chat_members;
  if (!newUsers || newUsers.length === 0) return;

  for (const tgUser of newUsers) {
    if (tgUser.is_bot) continue;

    try {
      // Register member in DB (creates record + referral code)
      const member = await getOrCreateMember(tgUser);

      // Welcome message in group
      const welcomeText = `👋 Welcome to Project Croissance, *${tgUser.first_name}*!

You've joined Africa's fastest-growing Web3 guild — where your skills are developed, your effort is tracked, and your contributions are *always rewarded*.

*What to do next:*
1️⃣ Open the Guild App to see your points and tasks
2️⃣ Introduce yourself in the chat (+10 CP)
3️⃣ Get your referral link and invite others (+10 CP per active referral)

Your referral code: \`${member.referral_code}\`

Tap below to get started 🌱`;

      await bot.sendMessage(msg.chat.id, welcomeText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Open Guild App', web_app: { url: MINIAPP_URL } },
          ]],
        },
      });

      console.log(`👋 New member joined group: ${tgUser.first_name} (${tgUser.id})`);
    } catch (err) {
      console.error('handleNewMember error:', err.message);
    }
  }
}

// ─────────────────────────────────────────────
// Award community activity points
// Called from admin panel or manually by team
// ─────────────────────────────────────────────
async function awardCommunityPoints(memberId, activity, awardedBy = 'system') {
  const activityPoints = {
    general_post:      2,
    ama_attendance:    5,
    ama_question:      3,
    space_attendance:  5,
    introduction:      10,
    help_member:       3,
  };

  const activityLabels = {
    general_post:      'Quality participation in #general',
    ama_attendance:    'Attended a live AMA session',
    ama_question:      'Asked a quality AMA question',
    space_attendance:  'Attended an X Space',
    introduction:      'Proper introduction in #general',
    help_member:       'Helped another member',
  };

  const points = activityPoints[activity];
  if (!points) return false;

  // Log the activity
  await supabase.from('community_activity').insert({
    member_id:   memberId,
    activity:    activity,
    points:      points,
    recorded_by: awardedBy,
  });

  // Award the points
  await awardPoints(
    memberId,
    points,
    activityLabels[activity] || activity,
    'community_activity',
    null,
    awardedBy
  );

  return true;
}

module.exports = { handleNewMember, awardCommunityPoints };