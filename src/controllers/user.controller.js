import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from '../utils/apiError.js';
import { User } from "../models/user.models.js";
import jwt from 'jsonwebtoken'

import { uploadOnCloudinary } from "../utils/cloudinary.js";


const generateAccessRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new apiError(500, "Something went wrong while generatig referesh and access token !")

    }
}

import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    //GET user details from frontend (or get data from postman)
    //validation - not empty
    // check if user already exist : username and email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object- create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return response

    const { fullName, email, username, password } = req.body
    // console.log('email : ', email)

    // if(fullName === "") {
    //     throw new apiError(400, "Full name is required !")
    // }

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new apiError(400, "All fields are required !");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User with email or username already exists !")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required !");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(400, "Avatar file is required !")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || " ",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, 'Something went wrong while registring the user');
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User register successfylly :)")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    //get date from request body
    // username or email based
    //find the user 
    // check password
    // access and refresh token 
    // send cookie 
    // response

    const { email, username, password } = req.body
    if (!username && !email) {
        throw new apiError(400, 'Username or Email is requred !')
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new apiError(404, "User does not exist !")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiError(401, "Password incorrect !")
    }

    const { accessToken, refreshToken } = await generateAccessRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200, {
                user: loggedInUser, accessToken, refreshToken
            },
                "User logged in successfully."
            )
        )

})


const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, {
        $unset: {
            refreshToken: 1
        }
    },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new apiError(401, "Unauthorized access!")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = User.findById(decodedToken?._id)

        if (!user) {
            throw new apiError(401, "Invilid refresh Token!")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token is expired or used !")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAccessRefreshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new apiResponse(
                200, {
                accessToken, refreshToken: newrefreshToken,
            },
                "Access token successfully refreshed."
            ))
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token!")

    }
})


const changeUserCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new apiError(400, "Invalid old password!")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new apiResponse(200, {}, "Password change successfully."))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status.json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new apiError(400, "All fields are required!")
    }

    const user = User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullName,
            email: email
        }
    }, { new: true }).select("-password")
    res.status(200).json(new apiResponse(200, user, "Account details updated successfully. "))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is missing!")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.usl) {
        throw new apiError(400, "Error while uploading on avatar!")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url,
        }
    }, { new: true }).select("-password")
    return res.status(200).json(new apiResponse(200, user, "Avatar image updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new apiError(400, "Cover image is missing!")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.usl) {
        throw new apiError(400, "Error while uploading on avatar!")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage.url,
        }
    }, { new: true }).select("-password")

    return res.status(200).json(new apiResponse(200, user, "Cover image updated successfully"))
})
export { registerUser, loginUser, logOutUser, refreshAccessToken, changeUserCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage }