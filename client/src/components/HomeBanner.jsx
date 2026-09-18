import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import banner1 from '../assets/banner1.webp';
import banner2 from '../assets/banner2.webp';
import banner3 from '../assets/banner3.webp';

const bannerData = [
  { image: banner1, link: '/grocery', alt: 'Snapit Groceries Delivered in 10 Minutes' },
  { image: banner2, link: '/grocery', alt: 'Snapit Everything You Need, Everyday' },
  { image: banner3, link: '/search?q=alpino', alt: 'Snapit Fuel a Healthier You - Alpino Oats & Muesli' },
];

const HomeBanner = () => {
  const navigate = useNavigate();
  const [swiperReady, setSwiperReady] = useState(false);

  return (
    <div className='container mx-auto px-3 sm:px-4 mt-1 sm:mt-2.5'>
      {/* 100% VISIBLE RESPONSIVE BANNER CONTAINER (2:1 RATIO) */}
      <div className='relative w-full aspect-[1024/514] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs border border-amber-100/80 dark:border-slate-800 bg-[#fdfbf7] dark:bg-slate-900'>

        {/* INSTANT PAINT LAYER (LCP) */}
        {!swiperReady && (
          <div className='relative w-full h-full'>
            <img
              src={banner1}
              alt='Snapit Groceries Delivered in 10 Minutes'
              className='absolute inset-0 w-full h-full object-contain object-center'
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
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          modules={[Autoplay]}
          className='mySwiper h-full w-full'
          onSwiper={() => setSwiperReady(true)}
        >
          {bannerData.map((item, index) => (
            <SwiperSlide
              key={index}
              onClick={() => navigate(item.link)}
              className='relative cursor-pointer w-full h-full flex items-center justify-center'
            >
              <img
                src={item.image}
                alt={item.alt}
                className='w-full h-full object-contain object-center select-none pointer-events-none'
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
