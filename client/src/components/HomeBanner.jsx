import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import banner1 from '../assets/banner1.webp';
import banner2 from '../assets/banner2.webp';
import banner3 from '../assets/banner3.webp';
import exclusiveOffersBanner from '../assets/exclusive_offers_banner.jpg';

const bannerData = [
  { image: exclusiveOffersBanner, link: '/category/all-deals' },
  { image: banner1, link: '/search?q=chicken' },
  { image: banner2, link: '/search?q=drink' },
  { image: banner3, link: '/search?q=oats' },
];

const HomeBanner = () => {
  const navigate = useNavigate();
  const [swiperReady, setSwiperReady] = useState(false);

  return (
    <div className='container mx-auto px-4 mt-2 lg:mt-3'>
      {/* 16:9 RESPONSIVE BANNER CONTAINER (Never crops text or images) */}
      <div className='relative w-full aspect-[16/9] max-h-[380px] rounded-2xl overflow-hidden shadow-sm group bg-slate-900'>

        {/* INSTANT PAINT LAYER (LCP) */}
        {!swiperReady && (
          <div className='relative w-full h-full'>
            <img
              src={exclusiveOffersBanner}
              alt='Snapit Up to 60% OFF Exclusive Offers'
              className='absolute inset-0 w-full h-full object-cover object-center'
              fetchPriority='high'
              loading='eager'
              decoding='async'
            />
          </div>
        )}

        {/* SWIPER BANNER CAROUSEL */}
        <Swiper
          spaceBetween={0}
          centeredSlides={true}
          loop={true}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          modules={[Autoplay, Pagination]}
          className='mySwiper h-full w-full'
          onSwiper={() => setSwiperReady(true)}
        >
          {bannerData.map((item, index) => (
            <SwiperSlide
              key={index}
              onClick={() => navigate(item.link)}
              className='relative cursor-pointer w-full h-full'
            >
              <img
                src={item.image}
                alt={`Snapit Promo ${index + 1}`}
                className='w-full h-full object-cover object-center select-none pointer-events-none'
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding='async'
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default HomeBanner;
