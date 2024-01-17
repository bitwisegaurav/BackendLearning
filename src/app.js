import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// setting middlewares
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }),
);
app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// import routers
import userRouter from "./routers/user.routes.js";

// use routers
app.use("/api/v1/user", userRouter);

export { app };
