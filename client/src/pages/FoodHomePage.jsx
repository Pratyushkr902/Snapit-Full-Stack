import React from "react"
import { useNavigate } from "react-router-dom"

const FoodHomePage = () => {
  const navigate = useNavigate()
  return (
    <section className="bg-white min-h-screen px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} className="p-2 rounded-full bg-gray-100 active:scale-95 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">🍔 Food Delivery</h1>
      </div>
      <div className="flex flex-col items-center justify-center mt-20 gap-4 text-center">
        <span className="text-6xl">🍽️</span>
        <h2 className="text-2xl font-bold text-gray-700">Coming Soon!</h2>
        <p className="text-gray-400 text-sm max-w-xs">We are onboarding restaurants in your area. Food delivery will be live very soon!</p>
        <button onClick={() => navigate("/")} className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-full font-semibold text-sm active:scale-95 transition">Back to Home</button>
      </div>
    </section>
  )
}

export default FoodHomePage
