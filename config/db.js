import mongoose from "mongoose"
import Category from "../models/category.js"

const connectDb=async()=>{
    try{
        const connect=await mongoose.connect(process.env.MONGODB_URI)
        const defaults = ["Technology", "Travel", "Lifestyle", "Business", "Education"];
        await Promise.all(
            defaults.map((title) =>
                Category.updateOne({ title }, { $setOnInsert: { title } }, { upsert: true }),
            ),
        );
        console.log("mongodb connected successfully")

    }
    catch(err){
        console.log(`some error occured during connection ${err}`)
    }
}

export default connectDb
