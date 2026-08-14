import { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import SuperAdminPermision from '../layouts/SuperAdminPermision'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'

const AdminReferrals = () => {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const response = await Axios({ ...SummaryApi.listReferralsAdmin })
        if (response.data.success) setReferrals(response.data.data || [])
      } catch (error) {
        AxiosToastError(error)
      } finally {
        setLoading(false)
      }
    }
    fetchReferrals()
  }, [])

  return (
    <SuperAdminPermision>
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>
          Referral Program
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', fontWeight: '600' }}>
          All referrers, their emails, and total earnings
        </p>
        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading...</p>
        ) : referrals.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No referral activity yet.</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '800', color: '#64748b' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '800', color: '#64748b' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '800', color: '#64748b' }}>Referrals</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: '800', color: '#64748b' }}>Total Earned</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1e293b' }}>{r.name}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.email}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.referralCount ?? 0}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                      {DisplayPriceInRupees(r.totalEarned || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminPermision>
  )
}

export default AdminReferrals
