import mongoose, { Schema } from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
    try {
        // const connectionInstance = 
        await mongoose.connect(`${process.env.MONGODB_ATLAS_URL}/${DB_NAME}`);
        // console.log("Database connected successfully. DB host : ", connectionInstance);
    } catch (error) {
        console.log("MongoDB connection failed", error);
        process.exit(1);
    }
}