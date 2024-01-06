import mongoose, {Schema} from "mongoose"

const videoSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 100,
    },
    description : {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 500,
    },
    videoFile: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    duration : {
        type: Number,
    },
    views : {
        type: Number,
        default: 0
    },
    isPublished : {
        type: Boolean,
        default: true
    }
},{timestamps: true})

export const Video = mongoose.model("Video", videoSchema)