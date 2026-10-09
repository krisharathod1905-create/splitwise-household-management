import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

export const joinOfficeRoom = (officeId) => {
  getSocket().emit("join:office", { officeId });
};

export const joinQueueRoom = (officeId, serviceId) => {
  getSocket().emit("join:queue", { officeId, serviceId });
};

export const joinUserRoom = (userId) => {
  getSocket().emit("join:user", { userId });
};

export const leaveOfficeRoom = (officeId) => {
  getSocket().emit("leave:office", { officeId });
};
