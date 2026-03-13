import express from "express";
import cors from "cors";
import { createServer } from "http";
import "dotenv/config";

import connectDB from "./config/db.js";
import { initSocket } from "./socket/socket.js";
import alertRoutes from "./routes/alertRoutes.js";

const app = express();

// create HTTP server
const httpServer = createServer(app);

// initialize socket
const io = initSocket(httpServer);

// connect database
await connectDB();

// middleware
app.use(cors());
app.use(express.json());

// make io accessible inside routes/controllers
app.set("io", io);

// test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// routes
app.use("/api/alerts", alertRoutes);

// PORT
const PORT = process.env.PORT || 5000;

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});