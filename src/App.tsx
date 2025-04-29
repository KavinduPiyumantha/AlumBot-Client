import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Loader2, Terminal } from "lucide-react";
import { Cross1Icon, EraserIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import "./App.css";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { getBotSettings, getUserToken, requestQA } from "./api";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import {
  clearHistoryMessage,
  getHistoryMessage,
  getUserID,
  saveHistoryMessage,
  saveUserID,
} from "./utils/storage";
import MessageList, { IMessageItem } from "./MessageList";
import InputBar from "./InputBar";
import SuggestionBar from "./SuggestionBar";

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

function App() {
  const [historyMessages, setHistoryMessages] = React.useState(
    [] as IMessageItem[]
  );
  const [loading, setLoading] = React.useState(false);
  const [wating, setWating] = React.useState(false);
  const [isMinScreen, setIsMinScreen] = React.useState(false);
  const [config, setConfig] = React.useState<API.BotSettings>();
  const [withError, setWithError] = React.useState(false);
  const needInitialMessag = React.useRef(true);
  const latestConfig = React.useRef<API.BotSettings | undefined>(config);
  const currentUser = React.useRef(getUserID());
  const authToken = React.useRef("");
  const controller = React.useRef(new AbortController());

  latestConfig.current = config;

  React.useEffect(() => {
    if (!currentUser.current) {
      currentUser.current = uuidv4();
      saveUserID(currentUser.current);
    }

    init();

    window.addEventListener("message", (evt) => {
      if (evt.data.event === "openIframe") {
        setIsMinScreen(evt.data.data);
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
        setIsMinScreen(evt.data.data);
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
  }, []);

  const init = async () => {
    setLoading(true);
    try {
      const {
        data: { token },
      } = await getUserToken(currentUser.current!);
      authToken.current = token;
      getConfig();
    } catch (error) {
      setWithError(true);
      return;
    }
    const msgs = getHistoryMessage().filter((msg) => msg.status !== "pending");
    setHistoryMessages(msgs);
    setLoading(false);
  };

  const getConfig = () => {
    getBotSettings().then(({ data }) => {
      setConfig(data.config);
      fireToParent("getConfig", data.config.chat_icon);
    });
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

  const closeIframe = () => fireToParent("closeIframe");

  const toogleSize = () => fireToParent("toogleSize");

  const fireToParent = (event: string, data?: unknown) => {
    window.parent.postMessage({ event, data }, "*");
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

  return (
    <div className="h-screen flex flex-col bg-white text-gray-800">
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
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" 
            title="Clear conversation"
            onClick={clearMessages}
          >
            <EraserIcon className="w-5 h-5" />
          </button>
          <button 
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" 
            title="Close"
            onClick={closeIframe}
          >
            <Cross1Icon className="w-5 h-5" />
          </button>
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
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
          <p className="text-gray-500 max-w-md mb-6">
            Ask me anything or use one of the suggested prompts below.
          </p>
        </div>
      ) : (
        <MessageList
          messages={historyMessages}
          regenerateAnswer={regenerateAnswer}
        />
      )}
      
      <div className="p-4">
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
