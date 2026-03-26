import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'; // NEW: For navigation
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import banner1 from '../assets/banner.jpg'
import banner2 from '../assets/Wide_Assortment-BbGMfwA2.png' 
import banner3 from '../assets/RakshaBandhan.jpg'

const HomeBanner = () => {
    const navigate = useNavigate();
    const [currentImage, setCurrentImage] = useState(0)

    // NEW: Banners with specific routes
    const banners = [
        { image: banner1, link: "/search?q=grocery" },
        { image: banner2, link: "/vegetables-fruits" },
        { image: banner3, link: "/festival-specials" }
    ]

    const nextImage = () => {
        setCurrentImage((prev) => (prev === banners.length - 1 ? 0 : prev + 1))
    }

    const prevImage = () => {
        setCurrentImage((prev) => (prev === 0 ? banners.length - 1 : prev - 1))
    }

    useEffect(() => {
        const interval = setInterval(() => {
            nextImage()
        }, 5000)
        return () => clearInterval(interval)
    }, [banners.length])

    return (
        <div className='container mx-auto px-4 mt-4'>
            <div className='relative w-full h-40 md:h-72 lg:h-96 rounded-xl overflow-hidden shadow-md group bg-blue-50'>
                
                {/* BANNERS CONTAINER */}
                <div 
                    className='flex transition-transform duration-700 ease-in-out h-full cursor-pointer'
                    style={{ transform: `translateX(-${currentImage * 100}%)` }}
                >
                    {banners.map((item, index) => (
                        <div 
                            key={index} 
                            className='w-full h-full flex-shrink-0'
                            onClick={() => navigate(item.link)} // NEW: Click to navigate
                        >
                             <img 
                                src={item.image}
                                alt="Snapit Banner"
                                className='w-full h-full object-cover banner-img-fade hover:scale-105 transition-transform duration-500' 
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>

                {/* NAVIGATION BUTTONS */}
                <div className='hidden group-hover:flex absolute inset-0 items-center justify-between px-4'>
                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className='bg-white/80 p-2 rounded-full shadow-lg hover:bg-white'>
                        <FaAngleLeft size={20}/>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className='bg-white/80 p-2 rounded-full shadow-lg hover:bg-white'>
                        <FaAngleRight size={20}/>
                    </button>
                </div>

                {/* DOTS INDICATOR */}
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2'>
                    {banners.map((_, index) => (
                        <button 
                            key={index}
                            onClick={(e) => { e.stopPropagation(); setCurrentImage(index); }}
                            className={`h-2 rounded-full transition-all ${currentImage === index ? "bg-white w-5" : "bg-white/50 w-2"}`}
                        ></button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default HomeBanner