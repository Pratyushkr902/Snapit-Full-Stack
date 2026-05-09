import React from 'react'
import { FaFacebook } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className='border-t'>
        <div className='container mx-auto p-4 text-center flex flex-col lg:flex-row lg:justify-between gap-2'>
            <p>© All Rights Reserved 2024 Snapit.</p>

            <div className='flex items-center gap-4 justify-center text-2xl'>
                <a 
                    href='https://www.facebook.com/profile.php?id=61589250579788' 
                    target='_blank' 
                    rel='noreferrer'
                    className='hover:text-blue-600 transition-colors'
                >
                    <FaFacebook/>
                </a>
                <a 
                    href='https://www.instagram.com/snapit.official_?igsh=eXNoMXk1NXRmb3dy&utm_source=qr' 
                    target='_blank' 
                    rel='noreferrer'
                    className='hover:text-pink-500 transition-colors'
                >
                    <FaInstagram/>
                </a>
            </div>
        </div>
    </footer>
  )
}

export default Footer