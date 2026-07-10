const { getOrCreateMember, processReferral, getMemberProfile, getLeaderboard } = require('./members');
const supabase = require('../supabase');

const COMMUNITY_LINK = process.env.COMMUNITY_LINK || 'https://t.me/projectcroissancechat';
const MINIAPP_URL    = process.env.MINIAPP_URL    || 'https://project-croissance-miniapp-ki2i.vercel.app/';
const BOT_USERNAME   = process.env.BOT_USERNAME   || 'Croissanceguildbot';

// ─────────────────────────────────────────────
// /start — entry point, opens mini app
// Also handles referral links: /start ref_CROI_ABC123
// ─────────────────────────────────────────────
async function handleStart(bot, msg) {
  const tgUser     = msg.from;
  const chatId     = msg.chat.id;
  const startParam = msg.text?.split(' ')[1]; // e.g. "ref_CROI_ABC123"

  try {
    // Register or fetch member
    const member = await getOrCreateMember(tgUser);

    // Process referral if they came via a link
    if (startParam && startParam.startsWith('ref_')) {
      const referralCode = startParam.replace('ref_', '');
      await processReferral(member.id, referralCode);
    }

    const tierEmoji = {
      Recruit:     '🌱',
      Active:      '⚡',
      Contributor: '🥉',
      Elite:       '🥇',
      Legacy:      '⭐',
    };

    const greeting = `${tierEmoji[member.tier] || '🌱'} *Welcome to Project Croissance, ${tgUser.first_name}!*

You're part of Africa's fastest-growing Web3 guild.

*Your stats:*
├ Monthly CP: *${member.monthly_points}*
├ Total CP: *${member.total_points}*
├ Tier: *${member.tier}*
└ Referral Code: \`${member.referral_code}\`

Use the app below to:
→ Generate your referral link
→ View and complete active tasks
→ Track the leaderboard in real time
→ See how to earn more CP

Let's grow. 🌱`;

    // Keyboard with Mini App button
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🚀 Open Guild App',
            web_app: { url: MINIAPP_URL },
          },
        ],
        [
          { text: '📋 My Points',    callback_data: 'my_points'   },
          { text: '🏆 Leaderboard', callback_data: 'leaderboard' },
        ],
        [
          { text: '🔗 My Referral Link', callback_data: 'referral_link' },
          { text: '📌 Active Tasks',     callback_data: 'tasks'         },
        ],
      ],
    };

    await bot.sendMessage(chatId, greeting, {
      parse_mode:   'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('handleStart error:', err);
    await bot.sendMessage(chatId, '❌ Something went wrong. Try again in a moment.');
  }
}

// ─────────────────────────────────────────────
// /points — show member's current CP and history
// ─────────────────────────────────────────────
async function handlePoints(bot, msg) {
  const chatId = msg.chat.id;
  const tgUser = msg.from;

  try {
    const member = await getMemberProfile(tgUser.id);
    if (!member) {
      return bot.sendMessage(chatId, '❌ You\'re not registered yet. Send /start first.');
    }

    // Get recent transactions
    const { data: txs } = await supabase
      .from('point_transactions')
      .select('points, reason, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const tierEmoji = { Recruit:'🌱', Active:'⚡', Contributor:'🥉', Elite:'🥇', Legacy:'⭐' };

    let history = '';
    if (txs && txs.length > 0) {
      history = '\n\n*Recent activity:*\n' + txs.map(tx => {
        const sign = tx.points >= 0 ? '+' : '';
        const date = new Date(tx.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
        return `└ \`${sign}${tx.points} CP\` — ${tx.reason} _(${date})_`;
      }).join('\n');
    }

    const msg_text = `${tierEmoji[member.tier] || '🌱'} *${member.first_name}'s CP Report*

*This Month:* ${member.monthly_points} CP
*All Time:* ${member.total_points} CP
*Tier:* ${member.tier}
*Referrals:* ${member.active_referrals || 0} active
*Submissions:* ${member.approved_submissions || 0} approved${history}

_Scores reset on the 1st of every month._
_Legacy Tier status never resets._ ⭐`;

    await bot.sendMessage(chatId, msg_text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Open Full App', web_app: { url: MINIAPP_URL } },
        ]],
      },
    });
  } catch (err) {
    console.error('handlePoints error:', err);
    await bot.sendMessage(chatId, '❌ Could not load your points. Try again.');
  }
}

// ─────────────────────────────────────────────
// /referral — show referral link + stats
// ─────────────────────────────────────────────
async function handleReferral(bot, msg) {
  const chatId = msg.chat.id;
  const tgUser = msg.from;

  try {
    const member = await getMemberProfile(tgUser.id);
    if (!member) {
      return bot.sendMessage(chatId, '❌ Send /start to register first.');
    }

    const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${member.referral_code}`;

    const text = `🔗 *Your Referral Link*

\`${referralLink}\`

Share this link to invite people to the guild.

*How it works:*
→ They click your link and open the bot
→ They join the community
→ After 7 days of activity, you earn *+10 CP*
→ Get 5 active referrals in a month → *+25 CP bonus*

*Your referrals this month:*
├ Total joined: ${member.total_referrals || 0}
└ Active (7+ days): ${member.active_referrals || 0}

_Tap and hold the link above to copy it._`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 Share My Link', url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Project Croissance — the Web3 guild where your skills get rewarded 🌱')}` }],
          [{ text: '🚀 Open Guild App', web_app: { url: MINIAPP_URL } }],
        ],
      },
    });
  } catch (err) {
    console.error('handleReferral error:', err);
    await bot.sendMessage(chatId, '❌ Could not load your referral link. Try again.');
  }
}

// ─────────────────────────────────────────────
// /tasks — list active tasks
// ─────────────────────────────────────────────
async function handleTasks(bot, msg) {
  const chatId = msg.chat.id;

  try {
    const { data: tasks } = await supabase
      .from('active_tasks')
      .select('*')
      .limit(5);

    if (!tasks || tasks.length === 0) {
      return bot.sendMessage(chatId,
        '📋 *No active tasks right now.*\n\nCheck back soon — new tasks drop every week.\n\nOpen the app to get notified.',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '🚀 Open Guild App', web_app: { url: MINIAPP_URL } }]] },
        }
      );
    }

    const taskTypeEmoji = { daily: '📅', timed: '⏱', ongoing: '🔄' };

    let text = `📋 *Active Tasks (${tasks.length})*\n\n`;
    tasks.forEach((task, i) => {
      const emoji   = taskTypeEmoji[task.task_type] || '📌';
      const expires = task.expires_at
        ? `Expires: ${new Date(task.expires_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}`
        : 'No deadline';
      text += `${emoji} *${task.title}*\n`;
      text += `├ Points: *+${task.points_reward} CP*\n`;
      text += `├ ${expires}\n`;
      text += `└ Proof required: ${task.requires_proof ? 'Yes' : 'No'}\n\n`;
    });

    text += '_Open the app to submit your proof and earn CP._';

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '📋 View & Submit Tasks', web_app: { url: MINIAPP_URL } }]],
      },
    });
  } catch (err) {
    console.error('handleTasks error:', err);
    await bot.sendMessage(chatId, '❌ Could not load tasks. Try again.');
  }
}

// ─────────────────────────────────────────────
// /leaderboard — top 10 this month
// ─────────────────────────────────────────────
async function handleLeaderboard(bot, msg) {
  const chatId = msg.chat.id;
  const tgUser = msg.from;

  try {
    const board = await getLeaderboard(10);

    if (!board || board.length === 0) {
      return bot.sendMessage(chatId, '🏆 The leaderboard is empty. Be the first to earn CP!');
    }

    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

    let text = `🏆 *Monthly Leaderboard*\n\n`;
    board.forEach((m, i) => {
      const name     = m.first_name || 'Member';
      const handle   = m.telegram_username ? ` @${m.telegram_username}` : '';
      const legacy   = m.is_legacy ? ' ⭐' : '';
      const medal    = medals[i] || `${i+1}.`;
      text += `${medal} *${name}*${handle}${legacy} — \`${m.monthly_points} CP\`\n`;
    });

    // Find caller's position
    const { data: myRank } = await supabase
      .from('leaderboard')
      .select('rank, monthly_points')
      .eq('telegram_id', tgUser.id)
      .single();

    if (myRank) {
      text += `\n_Your position: #${myRank.rank} with ${myRank.monthly_points} CP_`;
    }

    text += `\n\n_Updates in real time. Resets 1st of every month._`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🏆 Full Leaderboard', web_app: { url: MINIAPP_URL } }]],
      },
    });
  } catch (err) {
    console.error('handleLeaderboard error:', err);
    await bot.sendMessage(chatId, '❌ Could not load the leaderboard. Try again.');
  }
}

// ─────────────────────────────────────────────
// /help — command reference
// ─────────────────────────────────────────────
async function handleHelp(bot, msg) {
  const chatId = msg.chat.id;

  const text = `🌱 *Project Croissance — Bot Commands*

/start — Open the Guild App
/points — Check your CP balance and history
/referral — Get your referral link
/tasks — See active tasks
/leaderboard — Top 10 this month
/help — This message

*How to earn CP:*
→ Complete tasks and submit proof
→ Refer members (who stay 7+ days)
→ Be active in the community
→ Attend AMAs and Spaces

*Tiers:*
🌱 Recruit (0–49 CP)
⚡ Active (50–149 CP)
🥉 Contributor (150–299 CP)
🥇 Elite (300–499 CP)
⭐ Legacy (500+ CP × 3 months — permanent)

Open the app for the full rules and real-time board.`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🚀 Open Guild App', web_app: { url: MINIAPP_URL } }]],
    },
  });
}

module.exports = {
  handleStart,
  handlePoints,
  handleReferral,
  handleTasks,
  handleLeaderboard,
  handleHelp,
};