const supabase = require('../utils/supabase');

const getTransactions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Transaction')
      .select('*')
      .eq('userId', req.user.id)
      .order('date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createTransaction = async (req, res) => {
  const { amount, type, category, description, date } = req.body;
  try {
    const { data, error } = await supabase
      .from('Transaction')
      .insert([{
        id: require('crypto').randomUUID(),
        userId: req.user.id,
        amount,
        type,
        category,
        description,
        date: date || new Date().toISOString(),
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { amount, type, category, description, date } = req.body;
  try {
    const { data, error } = await supabase
      .from('Transaction')
      .update({ amount, type, category, description, date })
      .eq('id', id)
      .eq('userId', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('Transaction')
      .delete()
      .eq('id', id)
      .eq('userId', req.user.id);
    if (error) throw error;
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getTransactions, createTransaction, updateTransaction, deleteTransaction };