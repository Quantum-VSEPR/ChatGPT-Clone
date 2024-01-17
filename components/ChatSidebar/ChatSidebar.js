import { faPlus, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useState } from "react";
import GPTIcons from "./gpt-icon";
import { useUser } from "@auth0/nextjs-auth0/client";
import Image from "next/image";

export const ChatSidebar = ({ chatId }) => {
  const [chatList, setChatList] = useState([]);
  const { user } = useUser();
  useEffect(() => {
    const loadChatList = async () => {
      const response = await fetch(`/api/chat/getChatList`, {
        method: "POST",
      });

      const json = await response.json();
      setChatList(json?.chats || []);
    };
    loadChatList();
  }, [chatId]);
  return (
    <>
      <div
        className={` 
        hidden
         flex-col overflow-hidden bg-black text-white sm:flex `}
      >
        <Link href="/c" className="side-menu-item ml-3 mt-3 text-sm">
          <GPTIcons />
          <span className="m-[-.5rem]">New chat</span>
          <FontAwesomeIcon icon={faPlus} className="ml-16 text-xl " />
        </Link>
        <div className="flex-1 overflow-auto ">
          {chatList.map((chat) => (
            <Link
              key={chat._id}
              href={`/c/${chat._id}`}
              className={`side-menu-item ${
                chatId === chat._id ? "bg-gray-700" : ""
              }`}
            >
              <span className=" overflow-hidden text-ellipsis whitespace-nowrap">
                {chat.title}
              </span>
            </Link>
          ))}
        </div>
        <div>
          <Link
            href="/api/auth/logout"
            title="logout"
            className="side-menu-item"
          >
            <Image
              src={user?.picture}
              width={30}
              height={30}
              priority={true}
              alt="User avatar"
              className=" rounded-full shadow-md shadow-black/50"
            />

            <span>{user?.name}</span>

            <FontAwesomeIcon
              icon={faRightFromBracket}
              className="rotate-270 text-xl"
            />
          </Link>
        </div>
      </div>
    </>
  );
};
