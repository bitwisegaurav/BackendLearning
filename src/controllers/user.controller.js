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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
