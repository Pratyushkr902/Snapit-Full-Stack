# Snapit

A hyperlocal grocery and food delivery platform serving the Paliganj area of Bihar, India — built and operated as a real, running business.

Snapit connects local grocery stores and restaurants with customers for fast, reliable delivery, with dedicated experiences for customers, sellers, restaurant partners, riders, and admins.

## Features

- **Grocery delivery** — browse products across multiple local stores, cart, checkout, and track orders in real time
- **Restaurant / food ordering** — separate ordering flow for local restaurants with menu management
- **Real-time order tracking** — live rider location via Socket.IO
- **Snapit Plus** — membership program with delivery benefits
- **Wallet & referrals** — in-app wallet, referral rewards, coupons
- **Multi-role dashboards** — customer, seller/store, restaurant, rider, and admin experiences
- **Push notifications** — Firebase Cloud Messaging for order updates
- **Transactional email** — Brevo-powered order invoices, verification, and password reset flows
- **Payments** — Razorpay integration with server-side signature verification
- **PWA + Android app** — installable web app, plus a native Android build via Capacitor

## Tech Stack

**Frontend**
- React + Vite
- Redux Toolkit + Redux Persist
- React Router
- Capacitor (Android/iOS native builds)
- Socket.IO client
- Tailwind CSS

**Backend**
- Node.js + Express 5
- MongoDB + Mongoose
- Socket.IO (real-time rider tracking)
- JWT-based authentication
- Razorpay (payments)
- Firebase Admin (push notifications)
- Brevo (transactional email)
- Cloudflare R2 (image storage, via AWS S3-compatible SDK)

**Infrastructure**
- Frontend: Cloudflare Pages
- Backend: Railway
- Database: MongoDB Atlas

## License

Proprietary — all rights reserved.
