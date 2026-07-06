import DailyAccountModel from '../models/dailyAccount.model.js'

const toDayStart = (input) => {
  const d = input ? new Date(input) : new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

export const upsertDailyAccount = async (request, response) => {
  try {
    const { date, revenue = 0, expenses = [], notes = '' } = request.body

    if (!date) {
      return response.status(400).json({ message: 'Date is required', error: true, success: false })
    }

    const day = toDayStart(date)

    const cleanExpenses = Array.isArray(expenses)
      ? expenses
          .filter(e => e && e.label && e.label.trim() !== '')
          .map(e => ({ label: e.label.trim(), amount: Number(e.amount) || 0 }))
      : []

    const existing = await DailyAccountModel.findOne({ date: day })

    let saved
    if (existing) {
      existing.revenue = Number(revenue) || 0
      existing.expenses = cleanExpenses
      existing.notes = notes
      existing.createdBy = request.userId
      saved = await existing.save()
    } else {
      saved = await DailyAccountModel.create({
        date: day,
        revenue: Number(revenue) || 0,
        expenses: cleanExpenses,
        notes,
        createdBy: request.userId,
      })
    }

    return response.json({
      message: existing ? 'Entry updated' : 'Entry created',
      data: saved,
      error: false,
      success: true,
    })
  } catch (error) {
    return response.status(500).json({ message: error.message, error: true, success: false })
  }
}

export const getDailyAccounts = async (request, response) => {
  try {
    const { from, to } = request.query
    const filter = {}

    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = toDayStart(from)
      if (to) filter.date.$lte = toDayStart(to)
    }

    const entries = await DailyAccountModel.find(filter).sort({ date: -1 })

    const summary = entries.reduce((acc, e) => {
      acc.totalRevenue += e.revenue || 0
      acc.totalExpense += e.totalExpense || 0
      acc.totalProfit += e.netProfit || 0
      return acc
    }, { totalRevenue: 0, totalExpense: 0, totalProfit: 0 })

    return response.json({
      message: 'Entries fetched',
      data: entries,
      summary,
      error: false,
      success: true,
    })
  } catch (error) {
    return response.status(500).json({ message: error.message, error: true, success: false })
  }
}

export const deleteDailyAccount = async (request, response) => {
  try {
    const { id } = request.params
    await DailyAccountModel.findByIdAndDelete(id)
    return response.json({ message: 'Entry deleted', error: false, success: true })
  } catch (error) {
    return response.status(500).json({ message: error.message, error: true, success: false })
  }
}