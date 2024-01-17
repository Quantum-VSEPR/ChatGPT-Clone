import Image from "next/image";
import { useUser } from "@auth0/nextjs-auth0/client";
import ReactMarkdown from "react-markdown";
import GPTChatIcons from "components/ChatSidebar/gpt-chat-icons";

export const Message = ({ role, content }) => {
  const { user } = useUser();

  return (
    <div
      className={` grid grid-cols-[30px,1fr] gap-2 bg-[#343541] p-5 ${
        role === "assistant" ? "bg-[#343541]" : ""
      } `}
    >
      <div>
        {role === "user" && user?.picture && (
          <Image
            src={user?.picture}
            width={24}
            height={24}
            priority={true}
            alt="User avatar"
            className=" rounded-full shadow-md shadow-black/50"
          />
        )}
        {role === "assistant" && (
          <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-gray-800 shadow-md shadow-black/50">
            <GPTChatIcons />
          </div>
        )}
      </div>
      <div className="prose prose-invert  ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};
