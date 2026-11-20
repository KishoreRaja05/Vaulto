const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const morgan = require('morgan');
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/videos', require('./routes/videos'));

app.get('/', (req, res) => {
  res.json({ message: 'Vaulto API is running ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));