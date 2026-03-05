const express = require('express');
const router = express.Router();
const bankCardController = require('../controllers/bankCardController');
const { authMiddleware } = require('../middlewares/auth');

router.get('/', authMiddleware, bankCardController.getBankCards);
router.post('/', authMiddleware, bankCardController.addBankCard);
router.delete('/:id', authMiddleware, bankCardController.deleteBankCard);

module.exports = router;
