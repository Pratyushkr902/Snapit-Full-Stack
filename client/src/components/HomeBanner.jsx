import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// STEP 1: Import only the 3 new banners (Removing the old banner.jpg)
import banner1 from '../assets/IMG_6118.png'; // Snapit is Now Live
import banner2 from '../assets/IMG_6120.png'; // Exclusive Drinks
import banner3 from '../assets/IMG_6127.png'; // Powerful Nutrition

const HomeBanner = () => {
    const navigate = useNavigate();

    // Mapping banners to search queries for your live demo
    const bannerData = [
        { image: banner1, link: "/search?q=grocery" },
        { image: banner2, link: "/search?q=drinks" },
        { image: banner3, link: "/search?q=nutrition" }
    ];

    return (
        <div className='container mx-auto px-4 mt-2 lg:mt-4'>
            {/* FIXED: Constrained height so it doesn't push products off-screen */}
            <div className='w-full h-44 md:h-64 lg:h-80 rounded-2xl overflow-hidden shadow-sm group bg-slate-50'>
                <Swiper
                    spaceBetween={0}
                    centeredSlides={true}
                    loop={true}
                    autoplay={{
                        delay: 4000,
                        disableOnInteraction: false,
                    }}
                    pagination={{ 
                        clickable: true,
                        dynamicBullets: true 
                    }}
                    navigation={true}
                    modules={[Autoplay, Pagination, Navigation]}
                    className="mySwiper h-full w-full"
                >
                    {bannerData.map((item, index) => (
                        <SwiperSlide key={index} onClick={() => navigate(item.link)} className='cursor-pointer'>
                            <img 
                                src={item.image} 
                                alt={`Snapit Promo ${index + 1}`} 
                                // Using object-contain/fill so "Shop Now" text is never cut off
                                className='w-full h-full object-fill lg:object-cover'
                                loading="priority"
                            />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </div>
    );
};

export default HomeBanner;