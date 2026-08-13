import React, { useState, useEffect, useCallback } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import toast from 'react-hot-toast'

const todayStr = () => new Date().toISOString().slice(0, 10)

const emptyExpense = () => ({ label: '', amount: '' })

const Accounts = () => {
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState({ totalRevenue: 0, totalExpense: 0, totalProfit: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(todayStr())
  const [revenue, setRevenue] = useState('')
  const [expenses, setExpenses] = useState([emptyExpense()])
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await Axios({ ...SummaryApi.getDailyAccounts })
      if (res.data.success) {
        setEntries(res.data.data)
        setSummary(res.data.summary)
      }
    } catch (e) {
      console.error('Accounts fetch error', e)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const resetForm = () => {
    setDate(todayStr())
    setRevenue('')
    setExpenses([emptyExpense()])
    setNotes('')
    setEditingId(null)
  }

  const loadEntryIntoForm = (entry) => {
    setDate(entry.date.slice(0, 10))
    setRevenue(entry.revenue || '')
    setExpenses(
      entry.expenses?.length
        ? entry.expenses.map(e => ({ label: e.label, amount: e.amount }))
        : [emptyExpense()]
    )
    setNotes(entry.notes || '')
    setEditingId(entry._id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExpenseChange = (idx, field, value) => {
    setExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const addExpenseRow = () => setExpenses(prev => [...prev, emptyExpense()])

  const removeExpenseRow = (idx) => setExpenses(prev => prev.filter((_, i) => i !== idx))

  const totalExpensePreview = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const netProfitPreview = (Number(revenue) || 0) - totalExpensePreview

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!date) return toast.error('Pick a date')

    setSaving(true)
    try {
      const cleanExpenses = expenses
        .filter(x => x.label.trim() !== '')
        .map(x => ({ label: x.label.trim(), amount: Number(x.amount) || 0 }))

      const res = await Axios({
        ...SummaryApi.upsertDailyAccount,
        data: { date, revenue: Number(revenue) || 0, expenses: cleanExpenses, notes },
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Saved')
        resetForm()
        fetchEntries()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return
    try {
      const res = await Axios({ ...SummaryApi.deleteDailyAccount(id) })
      if (res.data.success) {
        toast.success('Deleted')
        if (editingId === id) resetForm()
        fetchEntries()
      }
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={{ background: '#0f1923', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase' }}>Total Revenue</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', marginTop: 4 }}>{DisplayPriceInRupees(summary.totalRevenue)}</div>
        </div>
        <div style={{ background: '#0f1923', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase' }}>Total Expense</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171', marginTop: 4 }}>{DisplayPriceInRupees(summary.totalExpense)}</div>
        </div>
        <div style={{ background: '#0f1923', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase' }}>Net Profit</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: summary.totalProfit >= 0 ? '#4ade80' : '#f87171', marginTop: 4 }}>
            {DisplayPriceInRupees(summary.totalProfit)}
          </div>
        </div>
      </div>

      {/* entry form */}
      <div style={{ background: '#0f1923', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1 }}>
            {editingId ? 'Edit Entry' : 'Add Daily Entry'}
          </h3>
          {editingId && (
            <button onClick={resetForm} type="button" style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>Date</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ background: '#0a1118', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>Revenue (₹)</span>
              <input
                type="number"
                value={revenue}
                onChange={e => setRevenue(e.target.value)}
                placeholder="0"
                style={{ background: '#0a1118', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12 }}
              />
            </label>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>Expenses</span>
              <button type="button" onClick={addExpenseRow} style={{ fontSize: 10, fontWeight: 800, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>
                + Add line
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenses.map((exp, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. Rider payout, fuel, packaging"
                    value={exp.label}
                    onChange={e => handleExpenseChange(idx, 'label', e.target.value)}
                    style={{ flex: 1, background: '#0a1118', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12 }}
                  />
                  <input
                    type="number"
                    placeholder="₹"
                    value={exp.amount}
                    onChange={e => handleExpenseChange(idx, 'amount', e.target.value)}
                    style={{ width: 110, background: '#0a1118', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12 }}
                  />
                  {expenses.length > 1 && (
                    <button type="button" onClick={() => removeExpenseRow(idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>Notes</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              style={{ background: '#0a1118', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Expense total: <b style={{ color: '#f87171' }}>{DisplayPriceInRupees(totalExpensePreview)}</b>
              {'  ·  '}
              Net profit: <b style={{ color: netProfitPreview >= 0 ? '#4ade80' : '#f87171' }}>{DisplayPriceInRupees(netProfitPreview)}</b>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: '#4ade80', color: '#052e16', fontWeight: 800, fontSize: 11,
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: 1, opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* history table */}
      <div style={{ background: '#0f1923', borderRadius: 16, padding: 20 }}>
        <h3 style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          Daily History
        </h3>

        {loading ? (
          <p style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: '30px 0' }}>Loading...</p>
        ) : entries.length === 0 ? (
          <p style={{ color: '#4b5563', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
            No entries yet. Add your first day above.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6b7280', textTransform: 'uppercase', fontSize: 9, letterSpacing: 1 }}>
                  <th style={{ padding: '8px 10px' }}>Date</th>
                  <th style={{ padding: '8px 10px' }}>Revenue</th>
                  <th style={{ padding: '8px 10px' }}>Expenses</th>
                  <th style={{ padding: '8px 10px' }}>Net Profit</th>
                  <th style={{ padding: '8px 10px' }}>Notes</th>
                  <th style={{ padding: '8px 10px' }}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry._id} style={{ borderTop: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px', color: '#4ade80', fontWeight: 700 }}>{DisplayPriceInRupees(entry.revenue)}</td>
                    <td style={{ padding: '10px', color: '#f87171' }}>
                      {DisplayPriceInRupees(entry.totalExpense)}
                      {entry.expenses?.length > 0 && (
                        <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                          {entry.expenses.map(e => `${e.label}: ${DisplayPriceInRupees(e.amount)}`).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 800, color: entry.netProfit >= 0 ? '#4ade80' : '#f87171' }}>
                      {DisplayPriceInRupees(entry.netProfit)}
                    </td>
                    <td style={{ padding: '10px', color: '#94a3b8', maxWidth: 160 }}>{entry.notes || '—'}</td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => loadEntryIntoForm(entry)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, marginRight: 10 }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(entry._id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Accounts