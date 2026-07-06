import mongoose from 'mongoose'

const expenseItemSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, default: 0 },
}, { _id: false })

const dailyAccountSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
  },
  revenue: {
    type: Number,
    default: 0,
  },
  expenses: {
    type: [expenseItemSchema],
    default: [],
  },
  totalExpense: {
    type: Number,
    default: 0,
  },
  netProfit: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
}, { timestamps: true })

dailyAccountSchema.pre('save', function (next) {
  this.totalExpense = (this.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  this.netProfit = (Number(this.revenue) || 0) - this.totalExpense
  next()
})

const DailyAccountModel = mongoose.model('dailyAccount', dailyAccountSchema)
export default DailyAccountModel