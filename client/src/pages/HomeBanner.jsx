import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Import your uploaded images (Ensure paths match your assets folder)
import banner1 from '../assets/IMG_6118.jpg'; // Snapit is Now Live
import banner2 from '../assets/IMG_6120.jpg'; // Exclusive Drinks
import banner3 from '../assets/IMG_6127.jpg'; // Powerful Nutrition

const HomeBanner = () => {
    const banners = [banner1, banner2, banner3];

    return (
        <div className='w-full h-full lg:h-80 bg-white rounded overflow-hidden'>
            <Swiper
                spaceBetween={0}
                centeredSlides={true}
                autoplay={{
                    delay: 3500,
                    disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                navigation={true}
                modules={[Autoplay, Pagination, Navigation]}
                className="mySwiper"
            >
                {banners.map((image, index) => (
                    <SwiperSlide key={index}>
                        <img 
                            src={image} 
                            alt={`Banner ${index + 1}`} 
                            className='w-full h-full object-cover'
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default HomeBanner;