import express from "express";
import { MongoQL } from "../context";

const app = express();
app.set("trust proxy", true);

export default app;