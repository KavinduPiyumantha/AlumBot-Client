import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import MarkdownPreview from "@uiw/react-markdown-preview";
import {
  CheckIcon,
  ClipboardCopyIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { ScrollArea } from "./components/ui/scroll-area";
import { cn, copyToClipboard } from "./utils/common";

dayjs.extend(relativeTime);

export interface IMessageItem {
  id: string;
  status: string;
  content: string;
  links: string[];
  isRecv: boolean;
  isInitial?: boolean;
  timestamp: number;
}

const encodeSpacesInMarkdownLinks = (markdown: string) => {
  return markdown.replace(/\[([^\]]+)\]\((.*?)\)/g, (_, text, url) => {
    const encodedUrl = url.replace(/ /g, "%20");
    return `[${text}](${encodedUrl})`;
  });
};

const MessageItem = ({
  message,
  reverse,
  regenerateAnswer,
}: {
  message: IMessageItem;
  reverse?: boolean;
  regenerateAnswer: (id: string) => void;
}) => {
  const [copyLoading, setCopyLoading] = React.useState(false);
  const isPending = message.status === "pending";
  const showMessageActions = !isPending && message.isRecv && !message.isInitial;

  // Remove Sources section completely including headings and links section
  const cleanContent = React.useMemo(() => {
    if (!message.isRecv) return message.content;

    // Check for Sources section with different possible formats
    const content = message.content
      // Handle ### Sources format (with heading)
      .replace(/#{1,3}\s*Sources:?[\s\S]*?(?=\n\n|$)/i, "")
      // Handle **Sources** format (with bold)
      .replace(/\*\*Sources\*\*:?[\s\S]*?(?=\n\n|$)/i, "")
      // Handle Sources: format (plain text)
      .replace(/Sources:[\s\S]*?(?=\n\n|$)/i, "");

    // Clean up any trailing whitespace or double line breaks
    return content.replace(/\n{3,}/g, "\n\n").trim();
  }, [message.content, message.isRecv]);

  const copyAnswer = () => {
    copyToClipboard(message.content);
    setCopyLoading(true);
    setTimeout(() => {
      setCopyLoading(false);
    }, 1500);
  };

  return (
    <div
      id={`msg_${message.id}`}
      className={cn(
        "w-full px-4 py-2 group mb-1 flex",
        reverse ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "message-container",
        reverse ? "user-message" : "assistant-message"
      )}>
        <div className="message-body">
          <div className={cn(
            "prose prose-slate",
            isPending && "opacity-70"
          )}>
            <MarkdownPreview
              wrapperElement={{
                "data-color-mode": "light",
              }}
              className="bg-transparent"
              components={{
                a: ({ children, ...props }) => (
                  <a {...props} target="_blank" className="text-blue-600 hover:underline">
                    {children}
                  </a>
                ),
              }}
              source={encodeSpacesInMarkdownLinks(cleanContent)}
            />
          </div>

          {/* Removed the links display section */}

          {isPending && (
            <div className="loading mt-2">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}

          {showMessageActions && (
            <div className={cn(
              "flex space-x-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity",
              reverse ? "justify-end" : "justify-start"
            )}>
              {copyLoading ? (
                <button className="flex items-center text-xs text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
                  <CheckIcon className="mr-1 h-3 w-3" />
                  Copied!
                </button>
              ) : (
                <button
                  className="flex items-center text-xs text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                  onClick={copyAnswer}
                >
                  <ClipboardCopyIcon className="mr-1 h-3 w-3" />
                  Copy
                </button>
              )}

              <button
                className="flex items-center text-xs text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => regenerateAnswer(message.id)}
              >
                <UpdateIcon className="mr-1 h-3 w-3" />
                Regenerate response
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageList = ({
  messages,
  regenerateAnswer,
}: {
  messages: IMessageItem[];
  regenerateAnswer: (id: string) => void;
}) => {
  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col items-center py-2">
        <div className="w-full max-w-[800px] mx-auto px-4">
          {messages.map((message) => (
            <MessageItem
              message={message}
              key={message.id}
              reverse={!message.isRecv}
              regenerateAnswer={regenerateAnswer}
            />
          ))}
        </div>
      </div>
      <div id="message-list-btm" className="h-px"></div>
    </ScrollArea>
  );
};

export default MessageList;
