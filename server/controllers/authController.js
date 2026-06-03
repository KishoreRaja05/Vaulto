const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const id = require('crypto').randomUUID();

    const { data: user, error } = await supabase
      .from('User')
      .insert([{ id, name, email, password: hashed }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    if (!user || error) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

const updateName = async (req, res) => {
  const { name } = req.body;
  try {
    const { data, error } = await supabase
      .from('User')
      .update({ name })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ user: { id: data.id, name: data.name, email: data.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('User')
      .update({ password: hashed })
      .eq('id', req.user.id);

    if (updateError) throw updateError;
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
module.exports = { signup, login, me, updateName, updatePassword };