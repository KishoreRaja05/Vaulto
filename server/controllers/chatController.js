const AI_TIMEOUT_MS = 30000;

const validateChatBody = (body) => {
  const errors = [];
  const source = body || {};
  const message = source.message;
  const history = source.history;

  if (typeof message !== 'string' || !message.trim()) {
    errors.push('message must be a non-empty string');
  } else if (message.length > 2000) {
    errors.push('message must be at most 2000 characters');
  }

  if (history !== undefined) {
    if (!Array.isArray(history)) {
      errors.push('history must be an array');
    } else {
      if (history.length > 20) errors.push('history must contain at most 20 messages');
      history.forEach((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push(`history[${index}] must be an object`);
          return;
        }
        if (!['user', 'assistant'].includes(item.role)) {
          errors.push(`history[${index}].role must be user or assistant`);
        }
        if (typeof item.content !== 'string') {
          errors.push(`history[${index}].content must be a string`);
        }
      });
    }
  }

  return errors;
};

const chat = async (req, res) => {
  const errors = validateChatBody(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join('; ') });

  if (!process.env.AI_SERVICE_URL) {
    return res.status(503).json({ message: 'AI assistant is unavailable' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(process.env.AI_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization,
      },
      body: JSON.stringify({
        user_id: req.user.id,
        message: req.body.message,
        history: req.body.history || [],
      }),
      signal: controller.signal,
    });

    if (response.status === 401) {
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
    if (!response.ok) {
      return res.status(502).json({ message: 'AI assistant is unavailable' });
    }

    const data = await response.json();
    if (!data || typeof data.reply !== 'string') {
      return res.status(502).json({ message: 'AI assistant is unavailable' });
    }

    res.json({
      reply: data.reply,
      tools_used: Array.isArray(data.tools_used)
        ? data.tools_used.filter((tool) => typeof tool === 'string')
        : [],
    });
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      return res.status(504).json({ message: 'AI assistant timed out. Please try again.' });
    }
    return res.status(503).json({ message: 'AI assistant is unavailable' });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { chat };
