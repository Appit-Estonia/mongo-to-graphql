import express from "express";

const app = express();
app.set("trust proxy", true);

export default app;