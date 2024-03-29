import { Router } from "express";
import { logOutUser, loginUser, registerUser, refreshAccessToken } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

router.route("/register").post(
    upload.fields([    // using middleware
        {
            name: "avatar",
            maxCount: 1
        },
        {

            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)


//secured routes
router.route("/logout").post(verifyJWT, logOutUser)

router.route("/refresh-token").report(refreshAccessToken)


export default router;