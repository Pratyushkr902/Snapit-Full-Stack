import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import SuperAdminPermision from '../layouts/SuperAdminPermision'

const AdminFrozenIps = () => {
  const [ips, setIps] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchIps = async () => {
    try {
      setLoading(true)
      const response = await Axios({ ...SummaryApi.listFrozenIps })
      if (response.data.success) setIps(response.data.data || [])
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchIps() }, [])

  const handleUnfreeze = async (ip) => {
    try {
      const response = await Axios({
        ...SummaryApi.unfreezeIp,
        url: SummaryApi.unfreezeIp.url + `/${ip}`,
      })
      if (response.data.success) {
        toast.success(`Unfroze ${ip}`)
        fetchIps()
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <SuperAdminPermision>
      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>
          Frozen IPs
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', fontWeight: '600' }}>
          Rate-limited IP addresses - unfreeze manually if needed
        </p>
        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading...</p>
        ) : ips.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No frozen IPs.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ips.map((entry, i) => {
              const ip = entry.ip || entry
              return (
                <div key={ip + i} style={{
                  background: '#fff', border: '1px solid #f1f5f9', borderRadius: '14px',
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '13px', color: '#1e293b' }}>{ip}</span>
                  <button onClick={() => handleUnfreeze(ip)}
                    style={{ fontSize: '11px', fontWeight: '800', padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#0ea5e9', color: '#fff' }}>
                    Unfreeze
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SuperAdminPermision>
  )
}

export default AdminFrozenIps
