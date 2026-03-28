import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Import your banners
import banner1 from '../assets/IMG_6118.png'; // Updated extensions based on your sidebar
import banner2 from '../assets/IMG_6120.png';
import banner3 from '../assets/IMG_6127.png';

const HomeBanner = () => {
    const banners = [banner1, banner2, banner3];

    return (
        // FIXED: Added max-h and rounded corners to keep it contained
        <div className='w-full lg:max-h-80 md:max-h-64 max-h-48 overflow-hidden rounded-lg shadow-sm my-2 px-4'>
            <Swiper
                spaceBetween={0}
                centeredSlides={true}
                autoplay={{ delay: 3500, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                navigation={true}
                modules={[Autoplay, Pagination, Navigation]}
                className="mySwiper h-full w-full"
            >
                {banners.map((image, index) => (
                    <SwiperSlide key={index} className='h-full w-full'>
                        <img 
                            src={image} 
                            alt={`Banner ${index + 1}`} 
                            // FIXED: object-fill ensures the "Shop Now" text stays visible
                            className='w-full h-full object-fill lg:object-cover'
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default HomeBanner;