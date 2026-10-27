import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../models/user.model.js";

let _io = null;

/**
 * Parses a standard Cookie header string into a key-value dictionary.
 * @param {string} cookieHeader
 * @returns {Record<string, string>}
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const cookies = {};
  cookieHeader.split(";").forEach((pair) => {
    const parts = pair.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  });
  return cookies;
}

/**
 * Initializes Socket.io attached to the given HTTP server.
 * Configures CORS, authentication middleware, and tenant room-joining.
 *
 * @param {import("http").Server} httpServer
 * @returns {Server}
 */
export function initSocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  // Socket authentication middleware
  _io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      const token = cookies.jwt;

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return next(new Error("User not found or deleted"));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized socket connection"));
    }
  });

  // Connection handler — joins user to isolated tenant room
  _io.on("connection", (socket) => {
    const userId = socket.data.user._id.toString();
    const room = `user:${userId}`;
    socket.join(room);
    console.log(`[socket] User ${userId} connected on socket ${socket.id} (room: ${room})`);

    socket.on("disconnect", (reason) => {
      console.log(`[socket] Socket ${socket.id} (User ${userId}) disconnected: ${reason}`);
    });
  });

  return _io;
}

/**
 * Safe getter for the Socket.io instance.
 * Returns null if initSocket has not yet been executed.
 *
 * @returns {Server|null}
 */
export function getIO() {
  return _io;
}
