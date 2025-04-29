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
import { Avatar, AvatarFallback } from "./components/ui/avatar";

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

const extractIfHasExtension = (url: string) => {
  const extensionRegex = /\.\w+$/;
  if (url.match(extensionRegex)) {
    const lastSlashIndex = url.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      return url.substring(lastSlashIndex + 1);
    }
  }
  return url;
};

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
        "px-4 py-6 group",
        reverse ? "user-message" : "assistant-message"
      )}
    >
      <div className="chat-container flex gap-4">
        {!reverse && (
          <div className="flex-shrink-0">
            <Avatar className="h-8 w-8 assistant-avatar">
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "prose prose-slate max-w-none",
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
              source={encodeSpacesInMarkdownLinks(message.content)}
            />
          </div>

          {!!message.links.length && (
            <div className="mt-4 border-t border-gray-200 pt-3">
              <p className="text-sm text-gray-500 mb-2">Source links:</p>
              <div className="flex flex-wrap gap-2">
                {message.links.map((link) => (
                  <a
                    className="px-3 py-1.5 border rounded-full text-sm border-gray-300 bg-white hover:bg-gray-50 cursor-pointer truncate max-w-full"
                    title={link}
                    href={link}
                    key={link}
                    target="_blank"
                  >
                    {extractIfHasExtension(link)}
                  </a>
                ))}
              </div>
            </div>
          )}

          {isPending && (
            <div className="loading mt-2">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}

          {showMessageActions && (
            <div className="flex space-x-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
        {reverse && (
          <div className="flex-shrink-0">
            <Avatar className="h-8 w-8 user-avatar">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        )}
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
      <div className="divide-y divide-gray-100">
        {messages.map((message) => (
          <MessageItem
            message={message}
            key={message.id}
            reverse={!message.isRecv}
            regenerateAnswer={regenerateAnswer}
          />
        ))}
      </div>
      <div id="message-list-btm" className="h-px"></div>
    </ScrollArea>
  );
};

export default MessageList;
