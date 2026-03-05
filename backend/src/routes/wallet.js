const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authMiddleware, roleCheck } = require('../middlewares/auth');

// 用户：查询账单
router.get('/records', authMiddleware, walletController.getWalletRecords);

// 用户：模拟充值
router.post('/recharge', authMiddleware, walletController.recharge);

// 服务者：发起提现
router.post('/withdraw', authMiddleware, walletController.requestWithdraw);

// 管理员/审核员：管理提现
router.get('/withdrawals', authMiddleware, roleCheck(['admin', 'finance', 'auditor']), walletController.getWithdrawalList);
router.put('/withdrawals/:id/review', authMiddleware, roleCheck(['admin', 'finance', 'auditor']), walletController.reviewWithdrawal);
router.get('/finance/stats', authMiddleware, roleCheck(['admin', 'finance']), walletController.getFinanceStats);
router.put('/orders/:id/settlement', authMiddleware, roleCheck(['admin', 'finance']), walletController.toggleOrderSettlement);
router.post('/orders/:id/manual-settle', authMiddleware, roleCheck(['admin', 'finance']), walletController.manualSettleOrder);

module.exports = router;
