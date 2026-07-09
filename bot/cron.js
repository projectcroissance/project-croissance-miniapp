const cron = require('node-cron');
const { checkReferralActivations, getLeaderboard } = require('./handlers/members');
const supabase = require('./supabase');

const COMMUNITY_GROUP_ID = process.env.COMMUNITY_GROUP_ID; // set this after adding bot to group

// ─────────────────────────────────────────────
// Start all cron jobs
// ─────────────────────────────────────────────
function startCronJobs(bot) {

  // ── Daily: Check referral activations (runs at 9am every day)
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily referral activation check...');
    try {
      await checkReferralActivations();
      console.log('✅ Referral check complete');
    } catch (err) {
      console.error('❌ Referral check error:', err.message);
    }
  });

  // ── Sunday 7pm: Weekly leaderboard announcement
  cron.schedule('0 19 * * 0', async () => {
    console.log('⏰ Posting weekly leaderboard...');
    try {
      if (!COMMUNITY_GROUP_ID) return;

      const board = await getLeaderboard(10);
      if (!board || board.length === 0) return;

      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

      // Get current week number
      const now       = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekNum   = Math.ceil(weekStart.getDate() / 7);

      let text = `🏆 *Weekly Leaderboard Update — Week ${weekNum}*\n\n`;
      board.forEach((m, i) => {
        const name   = m.first_name || 'Member';
        const handle = m.telegram_username ? ` @${m.telegram_username}` : '';
        const legacy = m.is_legacy ? ' ⭐' : '';
        text += `${medals[i]} *${name}*${handle}${legacy} — \`${m.monthly_points} CP\`\n`;
      });

      // Legacy tier members
      const { data: legacyMembers } = await supabase
        .from('members')
        .select('first_name, telegram_username')
        .eq('is_legacy', true);

      if (legacyMembers && legacyMembers.length > 0) {
        text += `\n⭐ *Legacy Tier (Permanent)*\n`;
        text += legacyMembers.map(m =>
          m.telegram_username ? `@${m.telegram_username}` : m.first_name
        ).join(' · ');
      }

      const daysLeft = 7 - new Date().getDay();
      text += `\n\n_${daysLeft} day${daysLeft !== 1 ? 's' : ''} left this week. Check your score: /points_`;

      await bot.sendMessage(COMMUNITY_GROUP_ID, text, { parse_mode: 'Markdown' });
      console.log('✅ Weekly leaderboard posted');
    } catch (err) {
      console.error('❌ Weekly leaderboard error:', err.message);
    }
  });

  // ── 1st of every month at midnight: Monthly reset
  cron.schedule('0 0 1 * *', async () => {
    console.log('⏰ Running monthly reset...');
    try {
      // 1. Announce reset is happening
      if (COMMUNITY_GROUP_ID) {
        const board = await getLeaderboard(3);
        let announcement = `🔄 *Monthly Leaderboard Reset — New Month Begins!*\n\n`;

        if (board && board.length > 0) {
          announcement += `*This month\'s final top 3:*\n`;
          const medals = ['🥇','🥈','🥉'];
          board.forEach((m, i) => {
            announcement += `${medals[i]} ${m.first_name || 'Member'} — \`${m.monthly_points} CP\`\n`;
          });
        }

        announcement += `\nAll scores reset to zero.\n`;
        announcement += `Legacy Tier status is permanent and never resets. ⭐\n\n`;
        announcement += `_Rewards will be distributed within 72 hours._\n`;
        announcement += `_New month, new board. Let\'s grow. 🌱_`;

        await bot.sendMessage(COMMUNITY_GROUP_ID, announcement, { parse_mode: 'Markdown' });
      }

      // 2. Run the reset in Supabase
      await supabase.rpc('monthly_reset');
      console.log('✅ Monthly reset complete');

      // 3. Post new month starting message
      if (COMMUNITY_GROUP_ID) {
        setTimeout(async () => {
          await bot.sendMessage(
            COMMUNITY_GROUP_ID,
            `🌱 *New month, fresh board.*\n\nEvery member starts at 0 CP.\nThe board is wide open.\n\nComplete tasks, refer members, show up — and climb. 💪\n\nCheck your tasks: /tasks`,
            { parse_mode: 'Markdown' }
          );
        }, 5000);
      }
    } catch (err) {
      console.error('❌ Monthly reset error:', err.message);
    }
  });

  // ── Saturday midnight -48hrs: Pre-reset warning
  cron.schedule('0 0 28-31 * *', async () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (today.getDate() !== lastDay - 1) return; // only run on second-to-last day

    try {
      if (!COMMUNITY_GROUP_ID) return;
      const board = await getLeaderboard(3);

      let text = `⚠️ *Reset in 48 hours!*\n\nThe monthly leaderboard resets in 2 days.\n\n`;

      if (board && board.length > 0) {
        text += `*Current top 3:*\n`;
        ['🥇','🥈','🥉'].forEach((m, i) => {
          if (board[i]) text += `${m} ${board[i].first_name} — \`${board[i].monthly_points} CP\`\n`;
        });
      }

      text += `\n_Complete your tasks now before the board locks._ ⏱\n/tasks`;
      await bot.sendMessage(COMMUNITY_GROUP_ID, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Pre-reset warning error:', err.message);
    }
  });

  console.log('✅ All cron jobs started');
}

module.exports = { startCronJobs };