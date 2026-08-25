import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import banner1 from '../assets/banner1.webp';
import banner2 from '../assets/banner2.webp';
import banner3 from '../assets/banner3.webp';
import rakhiBanner from '../assets/mgd_rakhi_banner.jpg';
import Axios from '../utils/Axios';

const bannerData = [
  { image: rakhiBanner, link: '/restaurant/6a3963a7e0dd57acb747e405', isFestive: true },
  { image: banner1, link: '/search?q=chicken' },
  { image: banner2, link: '/search?q=drink' },
  { image: banner3, link: '/search?q=oats' },
];

const HomeBanner = () => {
  const navigate = useNavigate();
  const [swiperReady, setSwiperReady] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [offer, setOffer] = useState({
    isActive: true,
    startsAt: '2026-08-27T18:30:00.000Z', // 28 August 00:00 IST
    endsAt: '2026-08-28T18:29:59.000Z',
  });

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
    expired: false,
  });

  useEffect(() => {
    Axios({ method: 'GET', url: '/api/festive-offer/current' })
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setOffer(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!offer.isActive) return;

    const updateTimer = () => {
      const now = Date.now();
      const startTime = new Date(offer.startsAt).getTime();
      const endTime = new Date(offer.endsAt).getTime();

      let diff = 0;
      let isLive = false;
      let expired = false;

      if (now < startTime) {
        diff = Math.max(0, startTime - now);
      } else if (now >= startTime && now < endTime) {
        diff = Math.max(0, endTime - now);
        isLive = true;
      } else {
        expired = true;
      }

      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / (24 * 3600));
      const hours = Math.floor((totalSec % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeft({ days, hours, minutes, seconds, isLive, expired });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  const showCountdown = offer.isActive && !timeLeft.expired;

  return (
    <div className='container mx-auto px-4 mt-2 lg:mt-4'>
      <div className='relative w-full h-48 sm:h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-sm group bg-slate-900'>

        {/* INSTANT PAINT LAYER (LCP) */}
        {!swiperReady && (
          <img
            src={rakhiBanner}
            alt='Raksha Bandhan MGD Special'
            className='absolute inset-0 w-full h-full object-cover object-center'
            fetchPriority='high'
            loading='eager'
            decoding='async'
          />
        )}

        {/* ULTRA-SLEEK FLOATING COUNTDOWN PILL (Integrated right on the banner) */}
        {showCountdown && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate('/restaurant/6a3963a7e0dd57acb747e405');
            }}
            className='absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 cursor-pointer transition-all hover:scale-105'
          >
            <div className='flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full backdrop-blur-md bg-black/75 border border-amber-400/60 shadow-xl text-white'>
              <span className='text-xs sm:text-sm animate-pulse'>
                {timeLeft.isLive ? '🔥' : '🪢'}
              </span>
              <div className='flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-300'>
                <span className='hidden xs:inline'>
                  {timeLeft.isLive ? 'Offer Ends In:' : 'Rakhi Starts:'}
                </span>
                <div className='flex items-center gap-0.5 font-mono font-black text-white text-[11px] sm:text-xs'>
                  {timeLeft.days > 0 && (
                    <>
                      <span className='text-amber-200'>{String(timeLeft.days).padStart(2, '0')}d</span>
                      <span className='text-amber-400'>:</span>
                    </>
                  )}
                  <span className='text-amber-200'>{String(timeLeft.hours).padStart(2, '0')}h</span>
                  <span className='text-amber-400'>:</span>
                  <span className='text-amber-200'>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                  <span className='text-amber-400'>:</span>
                  <span className='text-amber-200'>{String(timeLeft.seconds).padStart(2, '0')}s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SWIPER BANNER CAROUSEL */}
        <Swiper
          spaceBetween={0}
          centeredSlides={true}
          loop={true}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          navigation={true}
          modules={[Autoplay, Pagination, Navigation]}
          className='mySwiper h-full w-full'
          onSwiper={() => setSwiperReady(true)}
          onSlideChange={(swiper) => setCurrentSlideIndex(swiper.realIndex)}
        >
          {bannerData.map((item, index) => (
            <SwiperSlide
              key={index}
              onClick={() => navigate(item.link)}
              className='cursor-pointer w-full h-full'
            >
              <img
                src={item.image}
                alt={`Snapit Promo ${index + 1}`}
                className='w-full h-full object-cover object-center'
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
