import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        content: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 500,
        },
    },
    { timestamps: true },
);

export const Tweet = mongoose.model("Tweet", tweetSchema);
