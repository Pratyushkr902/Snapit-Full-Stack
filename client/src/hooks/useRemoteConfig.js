import { useState, useEffect } from 'react'
import { initRemoteConfig, getFlag, getFlagBool, getFlagNumber } from '../utils/firebase'

const useRemoteConfig = () => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      await initRemoteConfig()
      let parsedBanners = []
      try {
        const raw = getFlag('banners')
        parsedBanners = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : [])
      } catch (e) {
        parsedBanners = []
      }

      setConfig({
        // Banners
        banners: parsedBanners,

        // Feature Flags
        showWallet: getFlagBool('show_wallet'),
        showReferEarn: getFlagBool('show_refer_earn'),
        showFlashSale: getFlagBool('show_flash_sale'),
        showCouponBox: getFlagBool('show_coupon_box'),
        showWhatsappButton: getFlagBool('show_whatsapp_button'),
        enableCod: getFlagBool('enable_cod'),
        enableOnlinePayment: getFlagBool('enable_online_payment'),
        enableWalletPayment: getFlagBool('enable_wallet_payment'),

        // A/B
        checkoutLayout: getFlag('checkout_layout'),
        homeLayout: getFlag('home_layout'),
        promoBannerText: getFlag('promo_banner_text'),

        // Delivery
        freeDeliveryThreshold: getFlagNumber('free_delivery_threshold'),
        deliveryFee: getFlagNumber('delivery_fee'),

        // App state
        maintenanceMode: getFlagBool('app_maintenance_mode'),
        maintenanceMessage: getFlag('maintenance_message'),
        offerStripText: getFlag('offer_strip_text'),
        offerStripActive: getFlagBool('offer_strip_active'),
      })
      setLoading(false)
    }
    load()
  }, [])

  return { config, loading }
}

export default useRemoteConfig
