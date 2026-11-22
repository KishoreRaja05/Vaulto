const {
  createConversation,
  getOwnedConversation,
  getRecentMessages,
  insertMessage,
  touchConversation,
} = require('./conversationController');
const { DEFAULT_CATEGORIES, getCategoriesForUser } = require('../utils/categories');

const AI_TIMEOUT_MS = 30000;

// Give the model the exact category names it is allowed to reuse. Defaults are
// hardcoded; only the custom part comes from the user's Category rows.
const buildCategoryContext = async (userId) => {
  const fallback = {
    expense: [...DEFAULT_CATEGORIES.expense],
    income: [...DEFAULT_CATEGORIES.income],
  };
  try {
    const rows = await getCategoriesForUser(userId);
    return {
      expense: [...fallback.expense, ...rows.filter((row) => row.type === 'expense').map((row) => row.name)],
      income: [...fallback.income, ...rows.filter((row) => row.type === 'income').map((row) => row.name)],
    };
  } catch (err) {
    console.error(`[chat] could not load categories: ${err.message}`);
    return fallback;
  }
};

const INTENT_BY_TOOL = {
  predict_monthly_spending: 'forecast',
  detect_anomaly: 'anomaly_check',
  create_transaction: 'transaction',
  get_spending_summary: 'spending_summary',
};
const INTENT_PRIORITY = ['forecast', 'anomaly_check', 'transaction', 'spending_summary'];

const deriveIntent = (toolsUsed) => {
  const found = toolsUsed.map((tool) => INTENT_BY_TOOL[tool]).filter(Boolean);
  return INTENT_PRIORITY.find((intent) => found.includes(intent)) || found[0] || null;
};

const titleFromMessage = (message) => {
  const text = message.trim().replace(/\s+/g, ' ');
  return text.length > 40 ? `${text.slice(0, 40).trimEnd()}…` : text;
};

const getAiChatUrl = () => {
  const raw = (process.env.AI_SERVICE_URL || '').trim();
  if (!raw) return '';
  const base = raw.replace(/\/+$/, '');
  if (base.endsWith('/api/v1/chat')) return base;
  if (base.endsWith('/api/v1')) return `${base}/chat`;
  return `${base}/api/v1/chat`;
};

// Optional, compact description of the screen the user is on. Only plain
// strings / numbers / booleans / small arrays survive; everything is capped so
// the client cannot smuggle a large or nested payload into the model prompt.
const MAX_CONTEXT_CHARS = 1500;
const sanitizePageContext = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const clean = {};
  for (const [key, value] of Object.entries(raw).slice(0, 12)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) continue;
    if (typeof value === 'string') clean[key] = value.slice(0, 120);
    else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === 'boolean') clean[key] = value;
    else if (Array.isArray(value)) {
      clean[key] = value
        .filter((item) => ['string', 'number'].includes(typeof item))
        .slice(0, 10)
        .map((item) => (typeof item === 'string' ? item.slice(0, 60) : item));
    } else if (value && typeof value === 'object') {
      const nested = {};
      for (const [k, v] of Object.entries(value).slice(0, 8)) {
        if (/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(k) && ['string', 'number', 'boolean'].includes(typeof v)) {
          nested[k] = typeof v === 'string' ? v.slice(0, 60) : v;
        }
      }
      clean[key] = nested;
    }
  }
  if (!Object.keys(clean).length) return null;
  return JSON.stringify(clean).length <= MAX_CONTEXT_CHARS ? clean : null;
};

const validateChatBody = (body) => {
  const errors = [];
  const source = body || {};
  const message = source.message;

  if (typeof message !== 'string' || !message.trim()) {
    errors.push('message must be a non-empty string');
  } else if (message.length > 2000) {
    errors.push('message must be at most 2000 characters');
  }

  if (source.conversationId !== undefined && source.conversationId !== null) {
    if (typeof source.conversationId !== 'string' || !source.conversationId.trim()) {
      errors.push('conversationId must be a non-empty string');
    }
  }

  return errors;
};

const chat = async (req, res) => {
  const errors = validateChatBody(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join('; ') });

  const content = req.body.message.trim();
  const userId = req.user.id;
  let conversation;

  // Resolve the conversation strictly by its owner; never trust a userId in
  // the request body. An unknown id is indistinguishable from a hidden one.
  try {
    if (req.body.conversationId) {
      conversation = await getOwnedConversation(req.body.conversationId, userId);
      if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    } else {
      conversation = await createConversation(userId);
    }
  } catch (err) {
    console.error(`[chat] could not open conversation: ${err.message}`);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }

  let userMessage;
  let history;
  try {
    userMessage = await insertMessage({
      conversationId: conversation.id,
      role: 'user',
      content,
      intent: null,
    });
    // The just-saved user message is also passed separately as `message`, so
    // exclude it from history to avoid sending it twice to the LLM.
    const recent = await getRecentMessages(conversation.id, 11);
    history = recent
      .filter((message) => message.id !== userMessage.id)
      .slice(-10)
      .map(({ role, content: text }) => ({ role, content: text }));
  } catch (err) {
    console.error(`[chat] could not save user message: ${err.message}`);
    return res.status(500).json({
      message: 'Server error',
      error: err.message,
      conversationId: conversation.id,
    });
  }

  const isFirstMessage = history.length === 0 && conversation.title === 'New chat';
  const firstMessageTitle = isFirstMessage ? titleFromMessage(content) : conversation.title;

  const fail = async (status, message) => {
    try {
      await touchConversation(
        conversation.id,
        userId,
        isFirstMessage ? { title: firstMessageTitle } : {}
      );
    } catch (err) {
      console.error(`[chat] could not touch conversation: ${err.message}`);
    }
    return res.status(status).json({
      message,
      conversationId: conversation.id,
      title: firstMessageTitle,
      userMessageId: userMessage.id,
    });
  };

  const categories = await buildCategoryContext(userId);
  const pageContext = sanitizePageContext(req.body.pageContext);
  const aiUrl = getAiChatUrl();
  if (!aiUrl) return fail(503, 'AI assistant is unavailable');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: JSON.stringify({
        user_id: userId,
        message: content,
        history,
        categories,
        ...(pageContext ? { page_context: pageContext } : {}),
      }),
      signal: controller.signal,
    });

    if (response.status === 401) {
      return fail(401, 'Your session has expired. Please sign in again.');
    }
    if (response.status === 429) {
      return fail(429, 'Too many messages. Wait a moment.');
    }
    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        detail = '';
      }
      console.error(`[chat] AI service error ${response.status} at ${aiUrl}: ${detail.slice(0, 500)}`);
      return fail(503, 'AI assistant is unavailable');
    }

    let data;
    try {
      data = await response.json();
    } catch {
      console.error(`[chat] AI service returned invalid JSON at ${aiUrl}`);
      return fail(503, 'AI assistant is unavailable');
    }

    if (!data || typeof data.reply !== 'string') {
      console.error(`[chat] AI service response missing reply at ${aiUrl}`);
      return fail(503, 'AI assistant is unavailable');
    }

    const toolsUsed = Array.isArray(data.tools_used)
      ? data.tools_used.filter((tool) => typeof tool === 'string')
      : [];
    const intent = deriveIntent(toolsUsed);

    let assistantMessage;
    let updated;
    try {
      assistantMessage = await insertMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: data.reply,
        intent,
      });
      updated = await touchConversation(
        conversation.id,
        userId,
        isFirstMessage ? { title: firstMessageTitle } : {}
      );
    } catch (err) {
      console.error(`[chat] could not save assistant message: ${err.message}`);
      return res.status(500).json({
        message: 'Server error',
        error: err.message,
        conversationId: conversation.id,
      });
    }

    return res.json({
      reply: data.reply,
      intent,
      conversationId: conversation.id,
      title: updated?.title || conversation.title,
      messageId: assistantMessage.id,
      userMessageId: userMessage.id,
    });
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      return fail(504, 'AI assistant timed out. Please try again.');
    }
    console.error(`[chat] AI service request failed at ${aiUrl}: ${err.message}`);
    return fail(503, 'AI assistant is unavailable');
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { chat };
