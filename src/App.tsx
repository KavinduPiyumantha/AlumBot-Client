import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Loader2, Terminal, LogOut } from "lucide-react";
import { EraserIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import "./App.css";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { getBotSettings, getUserToken, requestQA } from "./api";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import {
  clearHistoryMessage,
  getHistoryMessage,
  getUserID,
  saveHistoryMessage,
  saveUserID
} from "./utils/storage";
import MessageList, { IMessageItem } from "./MessageList";
import InputBar from "./InputBar";
import SuggestionBar from "./SuggestionBar";
import Login from "./components/Login";

const pendingMessage = {
  id: "pending_id",
  status: "pending",
  content: "",
  links: [],
  isRecv: true,
} as unknown as IMessageItem;

const initialMessage = {
  id: uuidv4(),
  status: "success",
  content: "",
  links: [],
  isRecv: true,
  isInitial: true,
  timestamp: Date.now(),
};

const DefaultName = "AlumBot";

// Authentication utility functions
const saveAuthToken = (token: string) =>
  localStorage.setItem("alumbot_auth_token", token);
const getAuthToken = () => localStorage.getItem("alumbot_auth_token");
const removeAuthToken = () => localStorage.removeItem("alumbot_auth_token");
const isLoggedIn = () => !!getAuthToken();

function App() {
  const [historyMessages, setHistoryMessages] = React.useState(
    [] as IMessageItem[]
  );
  const [loading, setLoading] = React.useState(false);
  const [wating, setWating] = React.useState(false);
  const [config, setConfig] = React.useState<API.BotSettings>();
  const [withError, setWithError] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(isLoggedIn());
  const needInitialMessag = React.useRef(true);
  const latestConfig = React.useRef<API.BotSettings | undefined>(config);
  const currentUser = React.useRef(getUserID());
  const authToken = React.useRef(getAuthToken() || "");
  const controller = React.useRef(new AbortController());

  latestConfig.current = config; const fireToParent = React.useCallback((event: string, data?: unknown) => {
    window.parent.postMessage({ event, data }, "*");
  }, []);

  const getConfig = React.useCallback(() => {
    getBotSettings().then(({ data }) => {
      setConfig(data.config);
      fireToParent("getConfig", data.config.chat_icon);
    });
  }, [fireToParent]);

  // Make init a callback that doesn't need to be a dependency
  const initApp = React.useCallback(async () => {
    setLoading(true);
    try {
      // If we already have a token stored, use it
      if (authToken.current) {
        getConfig();
      } else {
        // Otherwise get a token using the user ID
        const {
          data: { token },
        } = await getUserToken(currentUser.current!);
        authToken.current = token;
        getConfig();
      }
    } catch (error) {
      setWithError(true);
      return;
    }
    const msgs = getHistoryMessage().filter((msg) => msg.status !== "pending");
    setHistoryMessages(msgs);
    setLoading(false);
  }, [getConfig]);

  // Initialize the component
  React.useEffect(() => {
    const setupInitialState = async () => {
      if (!currentUser.current) {
        currentUser.current = uuidv4();
        saveUserID(currentUser.current);
      }

      // If there's an auth token stored, assume we're authenticated
      if (authToken.current) {
        setIsAuthenticated(true);
      }

      await initApp();
    };

    setupInitialState();

    window.addEventListener("message", (evt) => {
      if (evt.data.event === "openIframe") {
        scrollToBottom("instant");
        if (
          latestConfig.current?.initial_messages.length &&
          needInitialMessag.current
        ) {
          const initialMessages = latestConfig.current.initial_messages.map(
            (message) => {
              initialMessage.content = message;
              return initialMessage;
            }
          );
          setHistoryMessages((prev) => {
            if (prev[prev.length - 1]?.isInitial) {
              return prev;
            }
            return [...prev, ...initialMessages];
          });
        }
        needInitialMessag.current = false;
      }
      if (evt.data.event === "resizeIframe") {
        // Removed setIsMinScreen since we no longer use isMinScreen
      }
    });
    window.addEventListener("beforeunload", () => {
      setHistoryMessages((msgs) => {
        if (msgs.length) {
          saveHistoryMessage(msgs);
        }
        return msgs;
      });
    });
  }, [initApp]);

  const handleLoginSuccess = (token: string) => {
    authToken.current = token;
    saveAuthToken(token);
    setIsAuthenticated(true);
    initApp();
  };
  const handleLogout = () => {
    authToken.current = "";
    removeAuthToken();
    setIsAuthenticated(false);
    setHistoryMessages([]);
  };

  const handleNewData = (streamString: string) => {
    setHistoryMessages((prev) => {
      const updatedMessages = [...prev];
      const lastMessage = updatedMessages[updatedMessages.length - 1];
      if (lastMessage.status === "pending") {
        lastMessage.status = "success";
        lastMessage.id = uuidv4();
      }
      lastMessage.content = streamString; // Append new content
      lastMessage.timestamp = Date.now();
      return updatedMessages;
    });
    scrollToBottom("smooth");
  };

  const sendQuestion = async (sendContent: string) => {
    if (wating) {
      controller.current.abort();
      controller.current = new AbortController();
      return;
    }

    if (sendContent) {
      requestQA({
        query: sendContent,
        user_id: currentUser.current!,
        token: authToken.current,
        controller: controller.current,
        onData: (str) => handleNewData(str),
      })
        .catch((error) => {
          const isCancel = error.name === "AbortError";
          const failedMessage = {
            id: uuidv4(),
            status: "failed",
            content: isCancel
              ? "Cancel to generate answer, please re-ask or request."
              : "Failed to generate answer, please try again later.",
            links: [],
            isRecv: true,
            timestamp: Date.now(),
          };
          setHistoryMessages((prev) => {
            prev[prev.length - 1] = failedMessage;
            return prev;
          });
        })
        .finally(() => setWating(false));

      const sentMessage = {
        id: uuidv4(),
        status: "success",
        content: sendContent,
        links: [],
        isRecv: false,
        timestamp: Date.now(),
      };
      setHistoryMessages((prev) => [
        ...prev,
        sentMessage,
        { ...pendingMessage },
      ]);
      setWating(true);
      scrollToBottom("smooth");
    }
  };
  const scrollToBottom = (behavior: ScrollBehavior) => {
    setTimeout(() => {
      const lastEl = document.getElementById("message-list-btm");
      if (lastEl) {
        lastEl.scrollIntoView({ behavior });
      }
    }, 50);
  };

  const clearMessages = () => {
    clearHistoryMessage();
    setHistoryMessages([]);
  };

  const regenerateAnswer = (id: string) => {
    const idx = historyMessages.findIndex((msg) => msg.id === id);
    const question = historyMessages[idx - 1]?.content;
    if (question) {
      requestQA({
        query: question,
        user_id: currentUser.current!,
        token: authToken.current,
        controller: controller.current,
        onData: (str) => handleNewData(str),
      })
        .catch((error) => {
          const isCancel = error.name === "AbortError";
          const failedMessage = {
            id: uuidv4(),
            status: "failed",
            content: isCancel
              ? "Cancel to generate answer, please re-ask or request."
              : "Failed to generate answer, please try again later.",
            links: [],
            isRecv: true,
            timestamp: Date.now(),
          };
          setHistoryMessages((prev) => {
            prev[idx] = failedMessage;
            return prev;
          });
        })
        .finally(() => setWating(false));
      setHistoryMessages((prev) => {
        prev[idx] = { ...prev[idx], status: "pending", content: "", links: [] };
        return prev;
      });
      setWating(true);
    }
  };

  const botName = config?.bot_name || DefaultName;
  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen flex flex-col bg-transparent text-gray-100">
      {/* header */}
      <div className="p-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center">
          <Avatar className="mr-3 h-8 w-8">
            <AvatarImage src={config?.bot_avatar} alt={botName} />
            <AvatarFallback className="bg-emerald-600 text-white text-sm">{botName.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="font-semibold">{botName}</div>
        </div>
        <div className="flex space-x-3">
          <button
            className="p-1.5 rounded-md hover:bg-gray-100/20 text-gray-300"
            title="Clear conversation"
            onClick={clearMessages}
          >
            <EraserIcon className="w-5 h-5" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-gray-100/20 text-gray-300"
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </button>
          {/* <button
            className="p-1.5 rounded-md hover:bg-gray-100/20 text-gray-200"
            title="Close"
            onClick={closeIframe}
          >
            <Cross1Icon className="w-5 h-5" />
          </button> */}
        </div>
      </div>

      {/* main content */}
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          {withError ? (
            <Alert className="max-w-md">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Connection failed</AlertTitle>
              <AlertDescription>
                Failed to connect to the server, please try again later.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      ) : historyMessages.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
          <MagnifyingGlassIcon className="w-16 h-16 text-white mb-4 drop-shadow-lg" />
          <h2 className="text-3xl text-white font-bold mb-3 drop-shadow-md">How can I help you today?</h2>
          <p className="text-white text-lg max-w-md mb-5">
            Ask me anything or use one of the suggested prompts below.
          </p>
          <div className="text-white max-w-md mb-6 border-t border-gray-400 pt-5 mt-2">
            <p className="text-lg mb-2 italic font-light">Research Project:</p>
            <p className=" text-xl mb-2">Developing an AI-based Aluminum Door and Window Frame profile selection tool</p>
            <p className="text-base">By W.A.Thisara Anuhas</p>
          </div>
        </div>
      ) : (
        <MessageList
          messages={historyMessages}
          regenerateAnswer={regenerateAnswer}
        />
      )}

      <div className=" max-w-[800px] mx-auto w-full flex flex-col">
        <SuggestionBar
          wating={wating}
          messages={config?.suggested_messages}
          sendQuestion={sendQuestion}
        />
        <InputBar
          loading={loading}
          wating={wating}
          placeholder={config?.placeholder}
          sendQuestion={sendQuestion}
        />
      </div>
    </div>
  );
}

export default App;
