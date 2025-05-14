import { IMessageItem } from "@/MessageList";

export const saveUserID = (userID: string) =>
  localStorage.setItem("kf_userID", userID);
export const getUserID = () => localStorage.getItem("kf_userID");

export const saveHistoryMessage = (msgs: IMessageItem[]) =>
  localStorage.setItem("tmp_user_history_message", JSON.stringify(msgs));
export const getHistoryMessage = () =>
  JSON.parse(
    localStorage.getItem("tmp_user_history_message") || "[]"
  ) as IMessageItem[];
export const clearHistoryMessage = () =>
  localStorage.removeItem("tmp_user_history_message");

// Authentication functions
export const saveAuthToken = (token: string) =>
  localStorage.setItem("alumbot_auth_token", token);
export const getAuthToken = () => localStorage.getItem("alumbot_auth_token");
export const removeAuthToken = () => localStorage.removeItem("alumbot_auth_token");
export const isLoggedIn = () => !!getAuthToken();
