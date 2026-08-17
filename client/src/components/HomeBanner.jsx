import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import banner1 from '../assets/banner1.webp';
import banner2 from '../assets/banner2.webp';
import banner3 from '../assets/banner3.webp';

// ✅ Each banner navigates to its own product search
const bannerData = [
  { image: banner1, link: '/search?q=chicken' },
  { image: banner2, link: '/search?q=drink' },
  { image: banner3, link: '/search?q=oats' },
]

const HomeBanner = () => {
  const navigate  = useNavigate()

  // Once Swiper has mounted and painted its own first slide,
  // we hide the instant static image so they don't double-stack.
  const [swiperReady, setSwiperReady] = useState(false)

  return (
    <div className='container mx-auto px-4 mt-2 lg:mt-4'>

      {/* Note: the "store closed" message lives in <StoreClosedOverlay allowBrowse />
          in Home.jsx, rendered once above this banner — it used to be duplicated
          here too, showing two separate closed messages stacked on the page. */}

      <div className='relative w-full h-44 md:h-64 lg:h-80 rounded-2xl overflow-hidden shadow-sm group bg-slate-50'>

        {/* INSTANT PAINT LAYER — plain img, no library, no JS init required.
            This is what becomes your LCP element. It paints as soon as the
            browser has the image bytes, independent of Swiper mounting. */}
        {!swiperReady && (
          <img
            src={banner1}
            alt='Snapit Promo 1'
            className='absolute inset-0 w-full h-full object-fill lg:object-cover'
            fetchPriority='high'
            loading='eager'
            decoding='async'
          />
        )}

        <Swiper
          spaceBetween={0}
          centeredSlides={true}
          loop={true}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          navigation={true}
          modules={[Autoplay, Pagination, Navigation]}
          className='mySwiper h-full w-full'
          onSwiper={() => setSwiperReady(true)}
        >
          {bannerData.map((item, index) => (
            <SwiperSlide
              key={index}
              onClick={() => navigate(item.link)}
              className='cursor-pointer'
            >
              <img
                src={item.image}
                alt={`Snapit Promo ${index + 1}`}
                className='w-full h-full object-fill lg:object-cover'
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding='async'
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}

export default HomeBanner