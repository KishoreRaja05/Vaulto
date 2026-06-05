import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import AppNav from '../components/AppNav'
import { useTheme } from '../context/ThemeContext'

function PageWrapper({ children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.45s cubic-bezier(.4,0,.2,1), transform 0.45s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

function Stagger({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s cubic-bezier(.4,0,.2,1), transform 0.5s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

const defaultCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Freelance']

const categoryColors = {
  Food: 'bg-orange-50 text-orange-600 border border-orange-200',
  Transport: 'bg-blue-50 text-blue-600 border border-blue-200',
  Shopping: 'bg-pink-50 text-pink-600 border border-pink-200',
  Bills: 'bg-red-50 text-red-600 border border-red-200',
  Entertainment: 'bg-purple-50 text-purple-600 border border-purple-200',
  Salary: 'bg-green-50 text-green-600 border border-green-200',
  Freelance: 'bg-teal-50 text-teal-600 border border-teal-200',
}

const emptyForm = () => ({
  amount: '',
  type: 'expense',
  category: 'Food',
  description: '',
  date: new Date().toISOString().split('T')[0],
})

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Transaction() {
  const { dark } = useTheme()
  const d = dark
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [categories, setCategories] = useState(defaultCategories)
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions')
      const uniqueTransactions = Array.from(new Map((res.data || []).map(item => [item.id, item])).values())
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      setTransactions(uniqueTransactions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    const loadTransactions = async () => {
      setLoading(true)
      try {
        const res = await api.get('/transactions')
        if (!isActive) return

        const uniqueTransactions = Array.from(new Map((res.data || []).map(item => [item.id, item])).values())
          .sort((a, b) => new Date(b.date) - new Date(a.date))

        setTransactions(uniqueTransactions)
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadTransactions()

    return () => {
      isActive = false
    }
  }, [])

  const openAdd = () => {
    setEditItem(null)
    setShowCustomInput(false)
    setCustomCategory('')
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (t) => {
    setEditItem(t)
    setShowCustomInput(false)
    setCustomCategory('')
    setForm({
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description || '',
      date: t.date.split('T')[0],
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      if (editItem) {
        await api.put(`/transactions/${editItem.id}`, form)
      } else {
        await api.post('/transactions', form)
      }
      setShowModal(false)
      fetchTransactions()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    setDeletingId(id)
    try {
      await api.delete(`/transactions/${id}`)
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const addCustomCategory = () => {
    const nextCategory = customCategory.trim()
    if (!nextCategory) return
    setCategories(prev => prev.includes(nextCategory) ? prev : [...prev, nextCategory])
    setForm({ ...form, category: nextCategory })
    setCustomCategory('')
    setShowCustomInput(false)
  }

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = income - expenses

  return (
    <PageWrapper>
      <div className={`min-h-screen transition-colors duration-300 ${d ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <AppNav />

        <div className="max-w-6xl mx-auto px-6 py-8">
          <Stagger delay={50}>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Transaction center</p>
                <h2 className={`text-2xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Transactions</h2>
                <p className="text-gray-500 text-sm mt-1">Add, edit, and review every income or expense entry.</p>
              </div>
              <button
                onClick={openAdd}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add transaction
              </button>
            </div>
          </Stagger>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Income', value: `Rs. ${income.toLocaleString()}`, tone: 'text-green-600', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
              { label: 'Total Expenses', value: `Rs. ${expenses.toLocaleString()}`, tone: 'text-red-500', iconBg: 'bg-red-50', iconColor: 'text-red-500' },
              { label: 'Net Balance', value: `Rs. ${balance.toLocaleString()}`, tone: balance >= 0 ? 'text-indigo-600' : 'text-red-500', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
            ].map((stat, i) => (
              <Stagger key={stat.label} delay={100 + i * 75}>
                <div
                  className={`rounded-2xl p-5 border h-full transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <div className={`w-8 h-8 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                      <svg className={`w-4 h-4 ${stat.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{transactions.length} total entries</p>
                </div>
              </Stagger>
            ))}
          </div>

          <Stagger delay={325}>
            <div
              className={`rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
            >
              <div className={`flex items-center justify-between px-6 py-4 border-b ${d ? 'border-gray-800' : 'border-gray-100'}`}>
                <div>
                  <h3 className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>All Transactions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Sorted from newest to oldest</p>
                </div>
                <span className="text-xs text-gray-400">{transactions.length} entries</span>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <svg className="w-5 h-5 animate-spin text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-14 text-center px-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className={`text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>No transactions yet</p>
                  <p className="text-xs text-gray-400 mb-4">Add your first income or expense to start tracking.</p>
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add transaction
                  </button>
                </div>
              ) : (
                <div className={`divide-y ${d ? 'divide-gray-800' : 'divide-gray-50'}`}>
                  {transactions.map((t, i) => (
                    <div
                      key={t.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 transition-all duration-150 group ${d ? 'hover:bg-gray-800/70' : 'hover:bg-gray-50'}`}
                      style={{ opacity: 0, animation: `fadeSlideIn 0.4s cubic-bezier(.4,0,.2,1) ${i * 45}ms forwards` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${categoryColors[t.category] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                          {t.category}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${d ? 'text-gray-200' : 'text-gray-900'}`}>{t.description || t.category}</p>
                          <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'}Rs. {Number(t.amount).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
                            aria-label="Edit transaction"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-all duration-150"
                            aria-label="Delete transaction"
                          >
                            {deletingId === t.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Stagger>
        </div>
      </div>

      {showModal && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ width: '100%', maxWidth: '440px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', border: `1px solid ${d ? '#1f2937' : '#e5e7eb'}`, background: d ? '#111827' : '#ffffff' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${d ? '#1f2937' : '#f3f4f6'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '14px', color: d ? '#f9fafb' : '#111827', margin: 0 }}>{editItem ? 'Edit Transaction' : 'Add Transaction'}</h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Keep your records clear and current.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} id="transaction-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none' }}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Category</label>
                  <select
                    value={showCustomInput ? 'custom' : form.category}
                    onChange={e => {
                      if (e.target.value === 'custom') {
                        setShowCustomInput(true)
                      } else {
                        setShowCustomInput(false)
                        setForm({ ...form, category: e.target.value })
                      }
                    }}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none' }}
                  >
                    {categories.map(c => <option key={c}>{c}</option>)}
                    <option value="custom">+ Add custom category</option>
                  </select>
                  {showCustomInput && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="e.g. Gym, Medical..."
                        style={{ flex: 1, padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none' }}
                      />
                      <button type="button" onClick={addCustomCategory} style={{ padding: '10px 16px', background: '#4f46e5', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Amount</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional"
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </form>
            </div>

            <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${d ? '#1f2937' : '#f3f4f6'}`, display: 'flex', gap: '12px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '10px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', color: d ? '#d1d5db' : '#374151', background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="transaction-form"
                disabled={submitting}
                style={{ flex: 1, padding: '10px', background: submitting ? '#818cf8' : '#4f46e5', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Saving...' : editItem ? 'Save Changes' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PageWrapper>
  )
}