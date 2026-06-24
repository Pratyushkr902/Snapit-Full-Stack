import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import banner1 from '../assets/banner1.webp';
import banner2 from '../assets/banner2.webp';
import banner3 from '../assets/banner3.webp';

// Returns current IST hour (0-23)
const getISTHour = () => {
  const now   = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const istMs = utcMs + 5.5 * 3600000
  return new Date(istMs).getHours()
}

const isStoreOpen = () => {
  const h = getISTHour()
  return h >= 8 && h < 21
}

const getOpeningMessage = () => {
  const h = getISTHour()
  return h >= 21 ? "We'll be back at 8:00 AM tomorrow 🌙" : 'We open at 8:00 AM today 🌅'
}

// banner1 = Chicken Meat Fish, banner2 = Cold Drinks Juices, banner3 = Breakfast Instant Food
const bannerData = [
  { image: banner1, link: '/search?q=chicken+meat+fish' },
  { image: banner2, link: '/search?q=cold+drinks+juices' },
  { image: banner3, link: '/search?q=breakfast+instant+food' },
]

const HomeBanner = () => {
  const navigate    = useNavigate()
  const storeOpen   = isStoreOpen()

  return (
    <div className='container mx-auto px-4 mt-2 lg:mt-4'>

      {/* Store Closed Strip */}
      {!storeOpen && (
        <div className='mb-3 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md'>
          <span className='text-2xl'>🌙</span>
          <div className='flex-1'>
            <p className='text-white font-bold text-sm'>Snapit is currently closed</p>
            <p className='text-gray-300 text-xs mt-0.5'>{getOpeningMessage()}</p>
          </div>
          <div className='text-right'>
            <p className='text-gray-400 text-[10px] font-medium'>Store hours</p>
            <p className='text-white text-xs font-bold'>8 AM – 9 PM</p>
          </div>
        </div>
      )}

      {/* Swiper */}
      <div className='w-full h-44 md:h-64 lg:h-80 rounded-2xl overflow-hidden shadow-sm group bg-slate-50'>
        <Swiper
          spaceBetween={0}
          centeredSlides={true}
          loop={true}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          navigation={true}
          modules={[Autoplay, Pagination, Navigation]}
          className='mySwiper h-full w-full'
        >
          {bannerData.map((item, index) => (
            <SwiperSlide key={index} onClick={() => navigate(item.link)} className='cursor-pointer'>
              <img
                src={item.image}
                alt={`Snapit Promo ${index + 1}`}
                className='w-full h-full object-fill lg:object-cover'
                loading='eager'
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}

export { isStoreOpen }
export default HomeBanner