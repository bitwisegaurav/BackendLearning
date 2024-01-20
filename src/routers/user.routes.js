import { Router } from "express";
import {
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateUserAvatarImage,
    updateUserCoverImage,
    updateUserDetails,
    updateUserPassword,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser,
);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-password").post(verifyJWT, updateUserPassword);
router.route("/update-user-details").post(verifyJWT, updateUserDetails);
router.route("/get-user-details").get(verifyJWT, getCurrentUser);
router
    .route("/update-avatar")
    .post(verifyJWT, upload.single("avatar"), updateUserAvatarImage);
router
    .route("/update-cover-image")
    .post(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

export default router;
