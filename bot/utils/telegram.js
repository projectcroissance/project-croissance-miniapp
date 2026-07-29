function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function send(bot, chatId, text, options = {}) {
  return bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    ...options,
  });
}

module.exports = {
  escapeHtml,
  send,
};