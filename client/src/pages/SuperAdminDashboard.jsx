import { useNavigate } from 'react-router-dom'
import SuperAdminPermision from '../layouts/SuperAdminPermision'
import AdminLiveFleetWidget from '../components/AdminLiveFleetWidget'
import AdminMarketingHub from '../components/AdminMarketingHub'

const CARDS = [
  {
    key: 'treasury',
    title: '💰 COD Cash Treasury & Partner Split',
    desc: 'Live COD cash collected, cash deposits, withdrawals & 50/50 partner distribution',
    icon: '💵',
    path: '/dashboard/super-admin/treasury',
    color: '#059669',
    bg: '#ecfdf5',
  },
  {
    key: 'withdrawals',
    title: 'Withdrawal Requests',
    desc: 'Approve or reject pending UPI wallet withdrawals',
    icon: '🏦',
    path: '/dashboard/super-admin/withdrawals',
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    key: 'referrals',
    title: 'Referral Program',
    desc: 'View all referrers, their emails, and total earnings',
    icon: '🎁',
    path: '/dashboard/super-admin/referrals',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    key: 'admins',
    title: 'Manage Admins',
    desc: 'Create, suspend, or remove admin accounts',
    icon: '👑',
    path: '/dashboard/super-admin/manage-admins',
    color: '#a855f7',
    bg: '#faf5ff',
  },
  {
    key: 'frozen-ips',
    title: 'Frozen IPs',
    desc: 'View and manually unfreeze rate-limited IP addresses',
    icon: '🧊',
    path: '/dashboard/super-admin/frozen-ips',
    color: '#0ea5e9',
    bg: '#f0f9ff',
  },
  {
    key: 'banner-offers',
    title: 'Festive Banners & Offers',
    desc: 'Manage Raksha Bandhan timer, 10% pizza discount & freebie perks',
    icon: '🍕',
    path: '/dashboard/super-admin/banner-offers',
    color: '#d97706',
    bg: '#fef3c7',
  },
  {
    key: 'rider-panel',
    title: 'Rider Panel',
    desc: 'View live deliveries, rider locations, and dispatch activity',
    icon: '🛵',
    path: '/rider-panel',
    color: '#ea580c',
    bg: '#fff7ed',
  },
]

const SuperAdminDashboard = () => {
  const navigate = useNavigate()

  return (
    <SuperAdminPermision>
      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
            👑 Super Admin Panel
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
            Elevated access — visible only to Super Admin accounts
          </p>
        </div>

        {/* 🛵 LIVE RIDER FLEET OVERVIEW */}
        <AdminLiveFleetWidget />

        {/* 📢 AUTOMATED MARKETING & ALL-USER BROADCAST HUB */}
        <AdminMarketingHub />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
        }}>
          {CARDS.map(card => (
            <button
              key={card.key}
              onClick={() => navigate(card.path)}
              style={{
                textAlign: 'left',
                background: '#fff',
                border: '1px solid #f1f5f9',
                borderRadius: '20px',
                padding: '22px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px -2px rgba(0,0,0,.06)',
                transition: 'all .18s',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0,0,0,.12)' }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,.06)' }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: card.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '24px', marginBottom: '14px',
              }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                {card.desc}
              </p>
              <div style={{ marginTop: '14px', fontSize: '12px', fontWeight: '800', color: card.color }}>
                Open →
              </div>
            </button>
          ))}
        </div>
      </div>
    </SuperAdminPermision>
  )
}

export default SuperAdminDashboard
