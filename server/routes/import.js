const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { parseImportFile } = require('../controllers/importController')

router.use(protect)
router.post('/parse', parseImportFile)

module.exports = router
