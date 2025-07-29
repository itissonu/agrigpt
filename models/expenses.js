const mongoose = require('mongoose');


const allocationSchema = new mongoose.Schema({
  cropId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
  },
  allocatedAmount: {
    type: Number,
    required: true,
    min: 0,
  }
}, { _id: false });

const expenditureSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,

    },
    subCategory: {
      type: String,
      default: '',
      // Example: "Organic Seeds", "Tractor Repair", etc.
    },
    cropsInvolved: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Crop'
      }
    ],
    allocationMethod: {
      type: String,
      enum: ['manual', 'fieldSize'],
      default: 'manual',
    },
    allocations: [allocationSchema],
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    frequency: {
      type: String,
      enum: ['Monthly', 'Seasonal', 'Yearly', 'One-Time'],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit'],
      default: 'Cash',
    },
    paidTo: {
      type: String,
      default: '',
      // Example: vendor name, worker name
    },
    invoiceNumber: {
      type: String,
      default: '',
    },
    farmSection: {
      type: String,
      default: '',

    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Expenditure', expenditureSchema);