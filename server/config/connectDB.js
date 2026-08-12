import mongoose from "mongoose"

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        throw new Error("Please provide MONGODB_URI in the .env file")
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("connect DB")
    } catch (error) {
        console.log("Mongodb connect error", error)
        process.exit(1)
    }
}

export default connectDB
