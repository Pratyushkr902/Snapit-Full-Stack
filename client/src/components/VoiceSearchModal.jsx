import React, { useState, useEffect, useRef } from 'react'
import { IoClose, IoMic, IoMicOff, IoLanguage, IoSparkles, IoSearch } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'

// Comprehensive Hindi (Devanagari + Hinglish) to English keywords mapping
const HINDI_TO_ENGLISH_SYNONYMS = {
  // Sugar
  'चीनी': 'sugar', 'cheeni': 'sugar', 'chini': 'sugar', 'शक्कर': 'sugar', 'shakkar': 'sugar',
  // Dairy & Milk
  'दूध': 'milk', 'doodh': 'milk', 'dudh': 'milk', 'अमूल': 'amul', 'अमुल': 'amul', 'amul': 'amul',
  'दही': 'curd', 'dahi': 'curd', 'मक्खन': 'butter', 'makhan': 'butter', 'butter': 'butter',
  'पनीर': 'paneer', 'paneer': 'paneer', 'छाछ': 'buttermilk', 'लस्सी': 'lassi', 'घी': 'ghee', 'ghee': 'ghee',
  // Oil & Ghee
  'तेल': 'oil', 'tel': 'oil', 'सरसों': 'mustard', 'sarson': 'mustard', 'रिफाइंड': 'refined oil', 'फॉर्च्यून': 'fortune', 'fortune': 'fortune',
  // Grains, Flours & Pulses
  'आटा': 'atta', 'aata': 'atta', 'atta': 'atta', 'आशीर्वाद': 'aashirvaad', 'aashirvaad': 'aashirvaad',
  'चावल': 'rice', 'chawal': 'rice', 'बासमती': 'basmati', 'दाल': 'dal', 'dal': 'dal', 'दालें': 'dal',
  'चना': 'chana', 'राजमा': 'rajma', 'छोले': 'chole', 'मैदा': 'maida', 'सूजी': 'sooji', 'बेसन': 'besan',
  // Veggies & Staples
  'आलू': 'potato', 'aloo': 'potato', 'aalu': 'potato', 'प्याज': 'onion', 'pyaj': 'onion', 'pyaaz': 'onion',
  'टमाटर': 'tomato', 'tamatar': 'tomato', 'लहसुन': 'garlic', 'lahsun': 'garlic', 'अदरक': 'ginger', 'adrak': 'ginger',
  'मिर्च': 'chilli', 'mirch': 'chilli', 'धनिया': 'coriander', 'dhaniya': 'coriander', 'हल्दी': 'turmeric', 'haldi': 'turmeric',
  'नमक': 'salt', 'namak': 'salt', 'टाटा': 'tata', 'मसाला': 'masala', 'जीरा': 'jeera',
  // Eggs & Meat
  'अंडा': 'egg', 'अंडे': 'eggs', 'anda': 'egg', 'ande': 'eggs', 'egg': 'egg', 'eggs': 'eggs',
  // Snacks, Bakery & Drinks
  'बिस्कुट': 'biscuit', 'बिस्किट': 'biscuit', 'biscuit': 'biscuit', 'पारले': 'parle', 'ब्रिटानिया': 'britannia',
  'मैगी': 'maggi', 'maggi': 'maggi', 'नूडल्स': 'noodles', 'पास्ता': 'pasta',
  'चिप्स': 'chips', 'कुरकुरे': 'kurkure', 'chips': 'chips', 'लेस': 'lays', 'lays': 'lays',
  'चाय': 'tea', 'चायपत्ती': 'tea', 'chai': 'tea', 'कॉफी': 'coffee', 'coffee': 'coffee',
  'नमकीन': 'namkeen', 'भुजिया': 'bhujia', 'मिक्सर': 'mixture', 'हल्दीराम': 'haldiram', 'बिकाजी': 'bikaji',
  'चॉकलेट': 'chocolate', 'डेयरी मिल्क': 'dairy milk', 'किटकेट': 'kitkat', 'ब्रेड': 'bread', 'टोस्ट': 'toast', 'रस्क': 'rusk',
  'कोल्ड ड्रिंक': 'cold drink', 'कोका कोला': 'coca cola', 'पेप्सी': 'pepsi', 'स्प्राइट': 'sprite', 'फ्रूटी': 'frooti', 'जूस': 'juice',
  // Cleaning & Personal Care
  'साबुन': 'soap', 'sabun': 'soap', 'सर्फ': 'surf', 'डिटर्जेंट': 'detergent', 'शैम्पू': 'shampoo', 'टूथपेस्ट': 'toothpaste', 'कोलगेट': 'colgate',
}

const FILLER_WORDS = new Set([
  // Devanagari Quantity & Fillers
  'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
  'किलो', 'केजी', 'ग्राम', 'लीटर', 'पैकेट', 'डिब्बा', 'बोतल', 'दर्जन',
  'मुझे', 'चाहिए', 'दिखाइए', 'दिखाओ', 'दीजिए', 'देना', 'लाओ', 'और', 'का', 'की', 'के', 'वाला', 'वाली', 'वाले', 'भी', 'कृपया',
  // English / Hinglish Quantity & Fillers
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'kilo', 'kg', 'kgs', 'gm', 'gms', 'gram', 'grams', 'litre', 'liter', 'litres', 'liters', 'packet', 'packets', 'pack', 'packs', 'bottle', 'box',
  'mujhe', 'chahiye', 'dikhaye', 'dikhao', 'dijiye', 'lao', 'aur', 'ka', 'ki', 'ke', 'bhi',
  'please', 'want', 'show', 'give', 'me', 'some', 'for', 'the', 'a', 'an'
])

export const cleanVoiceQuery = (rawText) => {
  if (!rawText) return ''
  let cleaned = rawText.toLowerCase().trim()
  
  // Strip punctuation
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
  
  const words = cleaned.split(/\s+/).filter(Boolean)
  const processedWords = []

  for (const word of words) {
    if (FILLER_WORDS.has(word)) continue
    if (HINDI_TO_ENGLISH_SYNONYMS[word]) {
      processedWords.push(HINDI_TO_ENGLISH_SYNONYMS[word])
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
  const autoSubmitTimerRef = useRef(null)

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

      // Auto-submit after silence or final result
      clearTimeout(autoSubmitTimerRef.current)
      if (event.results[0]?.isFinal) {
        autoSubmitTimerRef.current = setTimeout(() => {
          handleExecuteSearch(current)
        }, 500)
      } else {
        autoSubmitTimerRef.current = setTimeout(() => {
          if (current.trim()) {
            handleExecuteSearch(current)
          }
        }, 1500)
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
      clearTimeout(autoSubmitTimerRef.current)
      try {
        recognition.abort()
      } catch {}
    }
  }, [isOpen, lang])

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
        <div className='flex items-center gap-2 mb-4'>
          <button
            type='button'
            onClick={() => setLang(lang === 'hi-IN' ? 'en-IN' : 'hi-IN')}
            className='bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 text-emerald-400 transition-all'
          >
            <IoLanguage size={14} />
            <span>{lang === 'hi-IN' ? '🇮🇳 Hindi (हिन्दी)' : '🌐 English'}</span>
          </button>
        </div>

        {/* Glowing Microphone Button */}
        <div className='relative my-3'>
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
          <div className='flex items-center justify-center gap-1.5 h-6 my-1'>
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-3' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-6' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-4' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_150ms] h-7' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_250ms] h-5' />
            <div className='w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_350ms] h-3' />
          </div>
        )}

        {/* Status text */}
        <h3 className='text-lg font-black mt-2'>
          {isListening ? 'Listening...' : 'Tap Mic to Speak'}
        </h3>
        <p className='text-xs text-slate-400 mt-1 max-w-[240px]'>
          {isListening
            ? 'बोलिए: "एक किलो चीनी", "अमूल दूध", "मैगी"...'
            : 'Speak products in Hindi or English'}
        </p>

        {/* Live Transcript Display */}
        {transcript && (
          <div className='mt-4 w-full flex flex-col gap-2'>
            <div className='bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-sm font-bold text-emerald-300 w-full animate-fadeIn'>
              "{transcript}"
            </div>
            <button
              onClick={() => handleExecuteSearch(transcript)}
              className='w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95'
            >
              <IoSearch size={14} />
              <span>Search "{cleanVoiceQuery(transcript)}"</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <p className='text-xs text-red-400 mt-4 bg-red-950/50 border border-red-800/60 rounded-xl p-2.5'>
            {errorMessage}
          </p>
        )}

        {/* Quick Voice Suggestions */}
        <div className='mt-5 pt-3 border-t border-slate-800 w-full flex flex-col gap-2'>
          <p className='text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1'>
            <IoSparkles className='text-amber-400' size={12} />
            <span>Try Saying</span>
          </p>
          <div className='flex flex-wrap justify-center gap-1.5'>
            {['एक किलो चीनी', 'अमूल दूध', 'Fortune oil', 'Atta 5kg', 'Maggi'].map((sample) => (
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
