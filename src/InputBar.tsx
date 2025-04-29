import React from "react";
import { Textarea } from "./components/ui/textarea";
import { PaperPlaneIcon, StopIcon } from "@radix-ui/react-icons";

const InputBar = ({
  loading,
  wating,
  placeholder,
  sendQuestion,
}: {
  loading: boolean;
  wating: boolean;
  placeholder?: string;
  sendQuestion: (content: string) => void;
}) => {
  const [inputValue, setInputValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!loading && !wating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [loading, wating]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize the textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        internalSendQuestion();
      }
    }
  };

  const internalSendQuestion = () => {
    if (inputValue.trim()) {
      sendQuestion(inputValue);
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  return (
    <div className="w-full mt-2 chat-container mx-auto">
      <div className="flex w-full items-end border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        <Textarea
          className="flex-1 py-3 px-4 max-h-[200px] min-h-[50px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
          ref={textareaRef}
          value={inputValue}
          placeholder={placeholder || "Message AlumBot..."}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={loading || wating}
          rows={1}
        />
        <div className="flex-shrink-0 mr-2 mb-2">
          <button
            type="button"
            disabled={loading || !inputValue.trim()}
            className={`rounded-full h-8 w-8 flex items-center justify-center transition-colors ${inputValue.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-500'} disabled:opacity-50`}
            onClick={internalSendQuestion}
            aria-label={wating ? "Stop generating" : "Send message"}
          >
            {wating ? (
              <StopIcon className="h-4 w-4 text-current" />
            ) : (
              <PaperPlaneIcon className="h-4 w-4 text-current" />
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-center text-gray-500 mt-2">
        AlumBot can make mistakes. Consider checking important information.
      </p>
    </div>
  );
};

export default InputBar;
