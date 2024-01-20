import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";
import { uploadImage } from "../utils/cloudinary.util.js";

const options = {
    httpOnly: true,
    secure: true,
};

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating acess and refresh token",
        );
    }
};

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
    const coverImageLocalPath = req.files?.coverImage
        ? req.files?.coverImage[0]?.path
        : null;

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

const loginUser = asyncHandler(async (req, res) => {
    // take data from user (username/email, password) or refreshToken

    const { username, email, password } = req.body;

    // check the username/email and password
    if (!username && !email) {
        throw new ApiError(400, "Please provide username or email");
    }

    // find the user by username/email
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // match the password
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password");
    }

    // generate access and refresh Token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id,
    );

    // create a new object for response without password and refreshToken
    // const userResponse = ({
    //     _id,
    //     username,
    //     email,
    //     fullName,
    //     avatar,
    //     coverImage,
    // } = user);

    // or fetch data from database and remove password and refreshToken
    const userResponse = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    // send both tokens as cookies to the user
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, userResponse, "User logged in successfully"),
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.body._id,
        {
            $set: { refreshToken: undefined },
        },
        { new: true },
    );

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // get refresh token
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    try {
        // verify refresh token
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );

        // find user by id
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // check if refresh token is valid
        if (!user.refreshToken || user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // generate new access token
        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken,
                    },
                    "Access token refreshed successfully",
                ),
            );
    } catch (error) {
        throw new ApiError(404, error?.message || "Invalid Refresh Token");
    }
});

const updateUserPassword = asyncHandler(async (req, res) => {
    // check if user is authenticated
    if (!req.user) {
        throw new ApiError(401, "User not authenticated");
    }

    const { oldPassword, newPassword } = req.body;

    // check user input
    if (!(oldPassword && newPassword)) {
        throw new ApiError(400, "Please provide old and new password");
    }

    // find the user from database
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // check old password
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
    // check if user is authenticated
    if (!req.user) {
        throw new ApiError(401, "User not authenticated");
    }

    const { username, fullName, email } = req.body;

    // check user input
    if (!username && !fullName && !email) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    // find the user from database
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                ...(username && { username }),
                ...(email && { email }),
                ...(fullName && { fullName }),
            },
        },
        { new: true },
    ).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User details updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = res.user;

    if (!user) {
        throw new ApiError(
            401,
            "Cannot proivde current user because user is not authenticated",
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Successfully retrieved current user"),
        );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // check image local path
    const coverImageLocalPath = req.file.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Please provide cover image image");
    }

    // upload image on cloudinary
    const coverImage = await uploadImage(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(500, "Failed to upload cover image image");
    }

    // find user from database
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage,
            },
        },
        { new: true },
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const updateUserAvatarImage = asyncHandler(async (req, res) => {
    // check image local path
    const avatarLocalPath = req.file.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Please provide avatar image");
    }

    // upload image on cloudinary
    const avatar = await uploadImage(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar image");
    }

    // find user from database
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar,
            },
        },
        { new: true },
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateUserDetails,
    getCurrentUser,
    updateUserAvatarImage,
    updateUserCoverImage,
};
