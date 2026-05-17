import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

import banner1 from '../assets/banner1.png'
import banner2 from '../assets/banner2.png'
import banner3 from '../assets/banner3.png'

const bannerData = [
  { image: banner1, link: "/search?q=grocery",   alt: "Fresh groceries delivered in 9 minutes" },
  { image: banner2, link: "/search?q=drinks",    alt: "Cold drinks and juices" },
  { image: banner3, link: "/search?q=nutrition", alt: "Health and nutrition products" },
]

const HomeBanner = () => {
  const navigate = useNavigate()

  return (
    // ─── FIXED: Removed redundant container/px wrapper (Home.jsx already wraps this) 
    // ─── FIXED: Responsive height using aspect-ratio instead of fixed h-44/h-64/h-80
    //     aspect-ratio gives a natural banner shape on every screen size ─────────
    <div className='w-full rounded-2xl overflow-hidden bg-slate-100'>
      <div className='w-full' style={{ aspectRatio: '16/6' }}>
        <Swiper
          spaceBetween={0}
          centeredSlides={true}
          loop={true}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          // ─── FIXED: Navigation hidden on mobile (arrows on touch = bad UX) ──
          navigation={{ enabled: false }}
          breakpoints={{
            1024: { navigation: { enabled: true } }
          }}
          modules={[Autoplay, Pagination, Navigation]}
          className="h-full w-full"
        >
          {bannerData.map((item, index) => (
            <SwiperSlide
              key={index}
              onClick={() => navigate(item.link)}
              className='cursor-pointer'
            >
              <img
                src={item.image}
                alt={item.alt}
                // ─── FIXED: loading="priority" is invalid → fetchpriority="high" ──
                // First banner loads eagerly; rest are lazy ─────────────────────
                fetchpriority={index === 0 ? "high" : "low"}
                loading={index === 0 ? "eager" : "lazy"}
                // ─── FIXED: object-fill → object-cover (fill distorts images) ──
                className='w-full h-full object-cover banner-img-fade'
                // ─── ADDED: Fallback for broken banner images ─────────────────
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}

export default HomeBanner