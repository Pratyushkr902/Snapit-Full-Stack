import React from 'react'
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className='border-t border-slate-100 bg-white'>
        <div className='container mx-auto px-4 py-5 text-center flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs sm:text-sm text-slate-500'>
            <div className='flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2'>
                <p>© {new Date().getFullYear()} Snapit. All Rights Reserved.</p>
                <span className='hidden sm:inline text-slate-300'>•</span>
                <p className='font-medium text-slate-600 flex items-center gap-1'>
                    Co-powered by <span className='font-bold text-slate-800 tracking-wide'>Piyazo</span>
                </p>
            </div>
            <div className='flex items-center gap-4 justify-center text-xl text-slate-400'>
                <a 
                    href='https://www.facebook.com/share/18RV5RTPMc/?mibextid=wwXIfr' 
                    target='_blank' 
                    rel='noreferrer'
                    className='hover:text-blue-600 transition-colors'
                    aria-label='Facebook'
                >
                    <FaFacebook/>
                </a>
                <a 
                    href='https://www.instagram.com/snapitexpress/' 
                    target='_blank' 
                    rel='noreferrer'
                    className='hover:text-pink-500 transition-colors'
                    aria-label='Instagram'
                >
                    <FaInstagram/>
                </a>
                <a 
                    href='https://www.linkedin.com/company/snapitnow' 
                    target='_blank' 
                    rel='noreferrer'
                    className='hover:text-blue-700 transition-colors'
                    aria-label='LinkedIn'
                >
                    <FaLinkedin/>
                </a>
            </div>
        </div>
    </footer>
  )
}

export default Footer
