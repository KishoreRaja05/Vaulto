const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', decoded.id)
      .single();
    if (!user || error) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};

module.exports = { protect };