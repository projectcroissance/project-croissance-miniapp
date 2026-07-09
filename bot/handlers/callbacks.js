const { handlePoints, handleReferral, handleTasks, handleLeaderboard } = require('./commands');

// ─────────────────────────────────────────────
// Handle all inline keyboard button presses
// ─────────────────────────────────────────────
async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const data   = query.data;

  // Always answer the callback to remove loading state
  await bot.answerCallbackQuery(query.id);

  // Fake msg object so we can reuse command handlers
  const fakeMsg = {
    chat: { id: chatId },
    from: query.from,
    text: '',
  };

  switch (data) {
    case 'my_points':
      return handlePoints(bot, fakeMsg);

    case 'leaderboard':
      return handleLeaderboard(bot, fakeMsg);

    case 'referral_link':
      return handleReferral(bot, fakeMsg);

    case 'tasks':
      return handleTasks(bot, fakeMsg);

    default:
      return bot.sendMessage(chatId, '❓ Unknown action. Try /help');
  }
}

module.exports = { handleCallback };