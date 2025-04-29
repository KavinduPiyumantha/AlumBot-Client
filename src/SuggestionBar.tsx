import { StarIcon } from "@radix-ui/react-icons";

const SuggestionBar = ({
  wating,
  messages = [],
  sendQuestion,
}: {
  wating: boolean;
  messages?: string[];
  sendQuestion: (content: string) => void;
}) => {
  const notEmptyMessages = messages.filter(
    (message) => message.trim().length > 0
  );
  
  if (!notEmptyMessages.length) return null;

  return (
    <div className="mb-4 chat-container mx-auto">
      <div className="flex items-center justify-center mb-3">
        <div className="h-px flex-1 bg-gray-200"></div>
        <div className="mx-2 flex items-center text-xs text-gray-500 font-medium">
          <StarIcon className="h-3 w-3 mr-1" />
          Suggested prompts
        </div>
        <div className="h-px flex-1 bg-gray-200"></div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {notEmptyMessages.map((message, idx) => (
          <button
            key={idx}
            disabled={wating}
            className="flex px-4 py-3 border border-gray-200 rounded-xl text-sm text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => sendQuestion(message)}
          >
            <span className="line-clamp-2">{message}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionBar;
