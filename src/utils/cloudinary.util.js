import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (localFilePath) => {
    if (!localFilePath) return null;
    try {
        const cloudinaryUploadValue = await cloudinary.uploader.upload(
            localFilePath,
            { resource_type: "auto" },
        );
        // console.log(`File uplaoded. ${cloudinaryUploadValue.url}`);
        // console.log(cloudinaryUploadValue);
        fs.unlinkSync(localFilePath);
        return cloudinaryUploadValue.url;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log(error);
        return null;
    }
};

const deleteImage = async (publicIds) => {
    try {
        await cloudinary.uploader.destroy(publicIds);
        return true;
    } catch (error) {
        return false;
    }
};

export { uploadImage, deleteImage };
