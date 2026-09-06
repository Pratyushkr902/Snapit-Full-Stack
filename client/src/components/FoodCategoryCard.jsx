import React from 'react'
import { useNavigate } from 'react-router-dom'

const FoodCategoryCard = ({ category }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (category.comingSoon) return
    navigate(category.path)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        relative flex flex-col items-center justify-center
        ${category.bg} border ${category.border}
        rounded-2xl py-3 px-1.5
        shadow-sm active:scale-95
        transition-all duration-150 ease-out
        min-h-[80px] w-full
        focus:outline-none
        ${category.comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {category.comingSoon && (
        <span className="absolute top-1.5 right-1.5 bg-gray-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          Soon
        </span>
      )}
      <span className="text-2xl mb-1">{category.emoji}</span>
      <span className={`text-[11px] font-bold text-center leading-tight ${category.text || 'text-gray-800 dark:text-slate-100'}`}>
        {category.label}
      </span>
    </button>
  )
}

export default FoodCategoryCard
