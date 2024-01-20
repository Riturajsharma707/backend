// require('dotenv').config({path: './env'})

import dotenv from 'dotenv';
import { app } from './app.js'



// import mongoose, { mongo } from "mongoose";
// import { DB_NAME } from "./constants";

import connectDB from "./db/index.js";


dotenv.config({
    path: './.env'
})
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(` Server is running at port : ${process.env.PORT}`);
        })
    })
    .catch((error) => {
        console.log('Mongo DB connection failed !!', error);
    })








/*

    Another way to connect database


import express  from "express";

const app= express();
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("ERROR ",(error)=>{
            console.log("ERRR: ",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Applis listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("ERROR :", error);
        throw error;
    }
})()

*/