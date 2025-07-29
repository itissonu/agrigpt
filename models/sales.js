const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  vegetable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
  },
  quantity: { type: String, required: true },
  sellingPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  buyerName: { type: String, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Sale', saleSchema);