import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import SuperAdminPermision from '../layouts/SuperAdminPermision'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      const response = await Axios({ ...SummaryApi.listWithdrawals })
      if (response.data.success) setWithdrawals(response.data.data || [])
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWithdrawals() }, [])

  const handleAction = async (id, action) => {
    try {
      setActingId(id)
      const apiCall = action === 'APPROVED' ? SummaryApi.approveWithdrawal : SummaryApi.rejectWithdrawal
      const response = await Axios({
        ...apiCall,
        data: { withdrawalId: id },
      })
      if (response.data.success) {
        toast.success(`Withdrawal ${action.toLowerCase()}`)
        fetchWithdrawals()
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setActingId(null)
    }
  }

  return (
    <SuperAdminPermision>
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>
          Withdrawal Requests
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', fontWeight: '600' }}>
          Approve or reject pending UPI wallet withdrawals
        </p>
        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading...</p>
        ) : withdrawals.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No withdrawal requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {withdrawals.map(w => (
              <div key={w._id} style={{
                background: '#fff', border: '1px solid #f1f5f9', borderRadius: '14px',
                padding: '16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                    {w.user?.name || 'Unknown user'} ({w.user?.email})
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    UPI: {w.upiId || 'N/A'} - Requested {new Date(w.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '900', color: '#16a34a' }}>
                    {DisplayPriceInRupees(w.amount)}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px',
                    textTransform: 'uppercase',
                    background: w.status === 'PENDING' ? '#fef9c3' : w.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                    color: w.status === 'PENDING' ? '#a16207' : w.status === 'APPROVED' ? '#16a34a' : '#dc2626',
                  }}>
                    {w.status}
                  </span>
                  {w.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button disabled={actingId === w._id} onClick={() => handleAction(w._id, 'APPROVED')}
                        style={{ fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff' }}>
                        Approve
                      </button>
                      <button disabled={actingId === w._id} onClick={() => handleAction(w._id, 'REJECTED')}
                        style={{ fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff' }}>
                        Reject
                      </button>
                    </div>
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

export default AdminWithdrawals
