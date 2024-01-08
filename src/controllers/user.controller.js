import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";
import { uploadImage } from "../utils/cloudinary.util.js";

const registerUser = asyncHandler(async (req, res) => {
    // get user details
    const { username, email, fullName, password } = req.body;
    // console.log(req.body);
    // console.log(username, email, fullName, password);

    // validation for fields
    if (
        [username, email, fullName, password].some(
            (field) => field?.trim() === "",
        )
    ) {
        throw new ApiError(400, "Please provide all the details");
    }

    // check if user is already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists");
    }

    // check for avatar and coverImage localpaths
    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage ? req.files?.coverImage[0]?.path : null;

    // check avatar file
    if (!avatarLocalPath) {
        throw new ApiError(400, "Please provide avatar");
    }

    const avatar = await uploadImage(avatarLocalPath);
    const coverImage = await uploadImage(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Something went wrong while uploading avatar");
    }
    if (coverImageLocalPath && !coverImage) {
        throw new ApiError(
            500,
            "Something went wrong while uploading coverImage",
        );
    }

    // create user object and insert document in database'
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar,
        coverImage: coverImage || "",
    });

    // find the user from database and remove password and refreshToken from the data
    const findCreatedUser = await User.findById(user?._id).select(
        "-password -refreshToken",
    );

    // check if user created or not
    if (!findCreatedUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user",
        );
    }

    // return the response
    res.status(200).json(
        new ApiResponse(200, findCreatedUser, "User registered successfully"),
    );
    // res.status(200).json(
    //     new ApiResponse(200, {
    //         body: req.body,
    //         files: req.files,
    //     }, "User registered successfully"),
    // );
});

export { registerUser };
