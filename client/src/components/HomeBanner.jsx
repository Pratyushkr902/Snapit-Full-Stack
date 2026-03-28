import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Import your high-quality assets
import banner1 from '../assets/IMG_6118.Png'; // Snapit is Now Live
import banner2 from '../assets/IMG_6120.Png'; // Exclusive Drinks
import banner3 from '../assets/IMG_6127.Png'; // Powerful Nutrition

const HomeBanner = () => {
    const navigate = useNavigate();

    // Mapping banners to routes for your presentation demo
    const bannerData = [
        { image: banner1, link: "/search?q=grocery" },
        { image: banner2, link: "/category/6745..." }, // Replace with your Energy Drinks Category ID
        { image: banner3, link: "/category/6746..." }  // Replace with your Nutrition Category ID
    ];

    return (
        <div className='container mx-auto px-4 mt-2 lg:mt-4'>
            {/* FIXED: Added responsive height constraints to prevent the 'too large' issue */}
            <div className='w-full h-44 md:h-64 lg:h-80 rounded-2xl overflow-hidden shadow-sm group'>
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
                                // FIXED: object-fill ensures the 'Shop Now' text isn't cut off
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