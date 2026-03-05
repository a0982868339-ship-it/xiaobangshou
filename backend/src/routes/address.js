const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { authMiddleware } = require('../middlewares/auth');

router.get('/', authMiddleware, addressController.getAddresses);
router.get('/:id', authMiddleware, addressController.getAddressDetail);
router.post('/', authMiddleware, addressController.addAddress);
router.put('/:id', authMiddleware, addressController.updateAddress);
router.delete('/:id', authMiddleware, addressController.deleteAddress);

module.exports = router;
