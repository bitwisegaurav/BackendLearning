import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
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

export const Playlist = mongoose.model("Playlist", playlistSchema);
