import React, { useState, useEffect, useRef } from 'react'
import { IoClose, IoMic, IoMicOff, IoLanguage, IoSparkles } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// Hindi / Hinglish to English search keyword mappings
const HINDI_SYNONYMS = {
  'chini': 'sugar',
  'cheeni': 'sugar',
  'doodh': 'milk',
  'dudh': 'milk',
  'tel': 'oil',
  'sarson': 'mustard oil',
  'anda': 'egg',
  'ande': 'eggs',
  'dahi': 'curd',
  'makhan': 'butter',
  'paneer': 'paneer',
  'chawal': 'rice',
  'atta': 'atta',
  'aata': 'atta',
  'maida': 'flour',
  'besan': 'besan',
  'namak': 'salt',
  'haldi': 'turmeric',
  'mirch': 'chilli',
  'dhaniya': 'coriander',
  'tamatar': 'tomato',
  'aalu': 'potato',
  'aloo': 'potato',
  'pyaaz': 'onion',
  'pyaj': 'onion',
  'lahsun': 'garlic',
  'adrak': 'ginger',
  'biscuit': 'biscuit',
  'biskut': 'biscuit',
  'chai': 'tea',
  'patti': 'tea',
  'sabun': 'soap',
  'surf': 'detergent',
}

const FILLER_WORDS = [
  'mujhe', 'chahiye', 'dikhaye', 'dikhao', 'dijiye', 'lao', 'aur', 'ka', 'ki', 'ke', 'bhi',
  'please', 'want', 'show', 'give', 'me', 'some', 'kilo', 'kg', 'packet', 'litre', 'liter', 'gm', 'gram'
]

export const cleanVoiceQuery = (rawText) => {
  if (!rawText) return ''
  let cleaned = rawText.toLowerCase().trim()
  
  // Strip punctuation
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
  
  const words = cleaned.split(/\s+/)
  const processedWords = []

  for (const word of words) {
    if (FILLER_WORDS.includes(word)) continue
    if (HINDI_SYNONYMS[word]) {
      processedWords.push(HINDI_SYNONYMS[word])
    } else {
      processedWords.push(word)
    }
  }

  const result = processedWords.join(' ').trim()
  return result || cleaned
}

const VoiceSearchModal = ({ isOpen, onClose, onSearch }) => {
  const navigate = useNavigate()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lang, setLang] = useState('hi-IN') // 'hi-IN' or 'en-IN'
  const [errorMessage, setErrorMessage] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => {
      setIsListening(true)
      setErrorMessage('')
    }

    recognition.onresult = (event) => {
      let current = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript
      }
      setTranscript(current)

      if (event.results[0].isFinal) {
        const cleaned = cleanVoiceQuery(current)
        setTimeout(() => {
          handleExecuteSearch(cleaned || current)
        }, 600)
      }
    }

    recognition.onerror = (event) => {
      console.warn('[VoiceSearch] Error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Please allow mic permissions in browser settings.')
      } else if (event.error === 'no-speech') {
        setErrorMessage('No speech detected. Please tap the mic and try again.')
      } else {
        setErrorMessage(`Voice search error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    if (isOpen) {
      setTranscript('')
      setErrorMessage('')
      try {
        recognition.start()
      } catch (e) {
        console.warn('Recognition start error:', e)
      }
    }

    return () => {
      try {
        recognition.abort()
      } catch {}
    }
  }, [isOpen, lang])

  const handleExecuteSearch = (query) => {
    if (!query || !query.trim()) return
    const finalQuery = cleanVoiceQuery(query)
    onClose()
    if (onSearch) {
      onSearch(finalQuery)
    } else {
      navigate(`/search?q=${encodeURIComponent(finalQuery)}`)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      try { recognitionRef.current?.stop() } catch {}
      setIsListening(false)
    } else {
      setTranscript('')
      setErrorMessage('')
      try { recognitionRef.current?.start() } catch {}
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn'>
      <div className='bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 text-center text-white shadow-2xl relative overflow-hidden flex flex-col items-center'>

        {/* Close Button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-all'
        >
          <IoClose size={20} />
        </button>

        {/* Header / Language Badge */}
        <div className='flex items-center gap-2 mb-6'>
          <button
            type='button'
            onClick={() => setLang(lang === 'hi-IN' ? 'en-IN' : 'hi-IN')}
            className='bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 text-emerald-400 transition-all'
          >
            <IoLanguage size={14} />
            <span>{lang === 'hi-IN' ? '🇮🇳 Hindi / Hinglish' : '🌐 English'}</span>
          </button>
        </div>

        {/* Glowing Microphone Button */}
        <div className='relative my-4'>
          {isListening && (
            <>
              <div className='absolute inset-0 rounded-full bg-emerald-500/30 animate-ping' />
              <div className='absolute -inset-4 rounded-full bg-emerald-500/10 animate-pulse' />
            </>
          )}
          <button
            onClick={toggleListening}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all active:scale-95 ${
              isListening
                ? 'bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-emerald-500/40 ring-4 ring-emerald-400/30 scale-105'
                : 'bg-slate-800 text-slate-400 hover:text-white border-2 border-slate-700'
            }`}
          >
            {isListening ? <IoMic className='animate-bounce' /> : <IoMicOff />}
          </button>
        </div>

        {/* Live Soundwave Bars */}
        {isListening && (
          <div className='flex items-center justify-center gap-1.5 h-8 my-2'>
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-4' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-7' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-5' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_150ms] h-8' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_250ms] h-6' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_350ms] h-4' />
          </div>
        )}

        {/* Status text */}
        <h3 className='text-lg font-black mt-2'>
          {isListening ? 'Listening...' : 'Tap Mic to Speak'}
        </h3>
        <p className='text-xs text-slate-400 mt-1 max-w-[220px]'>
          {isListening
            ? 'Bolie: "1 kilo chini", "Amul milk", "Maggi"...'
            : 'Speak products in Hindi or English'}
        </p>

        {/* Live Transcript Display */}
        {transcript && (
          <div className='mt-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm font-bold text-emerald-300 w-full animate-fadeIn'>
            "{transcript}"
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <p className='text-xs text-red-400 mt-4 bg-red-950/50 border border-red-800/60 rounded-xl p-2.5'>
            {errorMessage}
          </p>
        )}

        {/* Quick Voice Suggestions */}
        <div className='mt-6 pt-4 border-t border-slate-800 w-full flex flex-col gap-2'>
          <p className='text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1'>
            <IoSparkles className='text-amber-400' size={12} />
            <span>Try Saying</span>
          </p>
          <div className='flex flex-wrap justify-center gap-1.5'>
            {['1 kilo chini', 'Amul doodh', 'Fortune oil', 'Atta 5kg', 'Kurkure'].map((sample) => (
              <button
                key={sample}
                onClick={() => handleExecuteSearch(sample)}
                className='text-[11px] bg-slate-800/80 hover:bg-emerald-950/60 hover:text-emerald-300 border border-slate-700/70 px-2.5 py-1 rounded-full text-slate-300 transition-all font-medium'
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default VoiceSearchModal
