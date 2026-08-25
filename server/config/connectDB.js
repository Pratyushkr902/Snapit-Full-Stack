import mongoose from "mongoose"

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        throw new Error("Please provide MONGODB_URI in the .env file")
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 50,
            minPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        })
        console.log("connect DB")
    } catch (error) {
        console.log("Mongodb connect error", error)
        process.exit(1)
    }
}

export default connectDB
