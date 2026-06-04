import mongoose from "mongoose"
import Category from "../models/category.js"

const connectDb=async()=>{
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("MONGODB_URI is missing. Add it to blog-cms/.env");
    }

    const connect=await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
    })
    const defaults = ["Technology", "Travel", "Lifestyle", "Business", "Education"];
    await Promise.all(
        defaults.map((title) =>
            Category.updateOne({ title }, { $setOnInsert: { title } }, { upsert: true }),
        ),
    );
    console.log(`mongodb connected successfully: ${connect.connection.host}`)
}

export default connectDb
