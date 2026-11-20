const supabase = require('../utils/supabase');
const { randomUUID } = require('crypto');

const DEFAULT_TITLE = 'New chat';

const timestamp = () => new Date().toISOString();

const toConversation = (row) => (row ? {
  id: row.id,
  title: row.title || DEFAULT_TITLE,
  createdAt: row.createdAt || null,
  updatedAt: row.updatedAt || null,
} : null);

const toMessage = (row) => (row ? {
  id: row.id,
  role: row.role === 'user' ? 'user' : 'assistant',
  content: typeof row.content === 'string' ? row.content : '',
  intent: row.intent || null,
  createdAt: row.createdAt || null,
} : null);

// --- Shared data helpers (also used by chatController) ---------------------

const createConversation = async (userId, title = DEFAULT_TITLE) => {
  const now = timestamp();
  const { data, error } = await supabase
    .from('Conversation')
    .insert([{ id: randomUUID(), userId, title, createdAt: now, updatedAt: now }])
    .select()
    .single();
  if (error) throw error;
  return toConversation(data);
};

// Never returns a conversation owned by anyone other than `userId`.
const getOwnedConversation = async (id, userId) => {
  if (!id || typeof id !== 'string') return null;
  try {
    const { data, error } = await supabase
      .from('Conversation')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .maybeSingle();
    if (error) return null;
    return toConversation(data);
  } catch {
    return null;
  }
};

const getConversationMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('Message')
    .select('*')
    .eq('conversationId', conversationId)
    .order('createdAt', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(toMessage);
};

// Returns the last `limit` messages in chronological order.
const getRecentMessages = async (conversationId, limit = 10) => {
  const { data, error } = await supabase
    .from('Message')
    .select('*')
    .eq('conversationId', conversationId)
    .order('createdAt', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(toMessage).reverse();
};

const insertMessage = async ({ conversationId, role, content, intent = null }) => {
  const { data, error } = await supabase
    .from('Message')
    .insert([{ id: randomUUID(), conversationId, role, content, intent, createdAt: timestamp() }])
    .select()
    .single();
  if (error) throw error;
  return toMessage(data);
};

const touchConversation = async (id, userId, extra = {}) => {
  const { data, error } = await supabase
    .from('Conversation')
    .update({ ...extra, updatedAt: timestamp() })
    .eq('id', id)
    .eq('userId', userId)
    .select()
    .single();
  if (error) throw error;
  return toConversation(data);
};

// --- HTTP handlers ---------------------------------------------------------

const listConversations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Conversation')
      .select('*')
      .eq('userId', req.user.id)
      .order('updatedAt', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(toConversation));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createUserConversation = async (req, res) => {
  try {
    const conversation = await createConversation(req.user.id);
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await getOwnedConversation(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const messages = await getConversationMessages(conversation.id);
    res.json({ conversation, messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const renameConversation = async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ message: 'title must be a non-empty string' });
  if (title.length > 80) return res.status(400).json({ message: 'title must be at most 80 characters' });

  try {
    const conversation = await getOwnedConversation(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const updated = await touchConversation(conversation.id, req.user.id, { title });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const conversation = await getOwnedConversation(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const { error } = await supabase
      .from('Conversation')
      .delete()
      .eq('id', conversation.id)
      .eq('userId', req.user.id);
    if (error) throw error;
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteAllConversations = async (req, res) => {
  try {
    const { error } = await supabase
      .from('Conversation')
      .delete()
      .eq('userId', req.user.id);
    if (error) throw error;
    res.json({ message: 'All conversations deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  listConversations,
  createUserConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  deleteAllConversations,
  // exported for the chat endpoint
  createConversation,
  getOwnedConversation,
  getConversationMessages,
  getRecentMessages,
  insertMessage,
  touchConversation,
  toConversation,
};
