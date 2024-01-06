import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
    },
    { timestamps: true },
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
