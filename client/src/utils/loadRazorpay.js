// 📁 src/utils/loadRazorpay.js
// Dynamically loads Razorpay script with retry logic
// Use this instead of relying on the static script tag in index.html

export const loadRazorpay = () => {
    return new Promise((resolve, reject) => {
        // ✅ Already loaded — use it directly
        if (window.Razorpay) {
            resolve(window.Razorpay)
            return
        }

        // ✅ Check if script tag already exists
        const existingScript = document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        )

        if (existingScript) {
            // Script tag exists but not loaded yet — wait for it
            existingScript.onload = () => {
                if (window.Razorpay) resolve(window.Razorpay)
                else reject(new Error('Razorpay failed to initialize'))
            }
            existingScript.onerror = () => reject(new Error('Razorpay script failed to load'))
            return
        }

        // ✅ Dynamically inject the script
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true

        script.onload = () => {
            if (window.Razorpay) resolve(window.Razorpay)
            else reject(new Error('Razorpay failed to initialize'))
        }

        script.onerror = () => reject(new Error('Razorpay script failed to load. Check your internet connection.'))

        document.body.appendChild(script)
    })
}