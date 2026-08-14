import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import SuperAdminPermision from '../layouts/SuperAdminPermision'

const AdminManageAdmins = () => {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await Axios({ ...SummaryApi.listAdmins })
      if (response.data.success) setAdmins(response.data.data || [])
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAdmins() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error('Fill all fields')
      return
    }
    try {
      setCreating(true)
      const response = await Axios({ ...SummaryApi.createAdmin, data: form })
      if (response.data.success) {
        toast.success('Admin created')
        setForm({ name: '', email: '', password: '' })
        fetchAdmins()
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (admin) => {
    const nextStatus = admin.status === 'Active' ? 'Suspended' : 'Active'
    try {
      const response = await Axios({
        ...SummaryApi.updateAdminStatus,
        url: SummaryApi.updateAdminStatus.url.replace(':adminId', admin._id),
        data: { status: nextStatus },
      })
      if (response.data.success) {
        toast.success(`Admin ${nextStatus.toLowerCase()}`)
        fetchAdmins()
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const handleRemove = async (admin) => {
    if (!window.confirm(`Remove admin ${admin.email}?`)) return
    try {
      const response = await Axios({
        ...SummaryApi.removeAdmin,
        url: SummaryApi.removeAdmin.url.replace(':adminId', admin._id),
      })
      if (response.data.success) {
        toast.success('Admin removed')
        fetchAdmins()
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <SuperAdminPermision>
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>
          Manage Admins
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', fontWeight: '600' }}>
          Create, suspend, or remove admin accounts
        </p>

        <form onSubmit={handleCreate} style={{
          background: '#fff', border: '1px solid #f1f5f9', borderRadius: '14px',
          padding: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px',
        }}>
          <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ flex: 1, minWidth: '140px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={{ flex: 1, minWidth: '140px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ flex: 1, minWidth: '140px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
          <button type="submit" disabled={creating}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#a855f7', color: '#fff', fontWeight: '800', fontSize: '12px' }}>
            {creating ? 'Creating...' : '+ Add Admin'}
          </button>
        </form>

        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading...</p>
        ) : admins.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No admins found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {admins.map(a => (
              <div key={a._id} style={{
                background: '#fff', border: '1px solid #f1f5f9', borderRadius: '14px',
                padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                    {a.name} <span style={{ fontSize: '10px', fontWeight: '800', color: '#a855f7', marginLeft: '6px' }}>{a.role}</span>
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{a.email}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px',
                    background: a.status === 'Active' ? '#dcfce7' : '#fee2e2',
                    color: a.status === 'Active' ? '#16a34a' : '#dc2626',
                  }}>
                    {a.status || 'Active'}
                  </span>
                  {a.role !== 'SUPER_ADMIN' && (
                    <>
                      <button onClick={() => handleToggleStatus(a)}
                        style={{ fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff' }}>
                        {a.status === 'Active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button onClick={() => handleRemove(a)}
                        style={{ fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff' }}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SuperAdminPermision>
  )
}

export default AdminManageAdmins
