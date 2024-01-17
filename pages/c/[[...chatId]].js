import { useEffect, useRef, useState } from "react";
import { ChatSidebar } from "components/ChatSidebar";
import Head from "next/head";
import { v4 as uuid } from "uuid";
import { Message } from "components/Message";
import { useRouter } from "next/router";
import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";

import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const ChatPage = ({ chatId, title, messages = [] }) => {
  const [newChatId, setNewChatId] = useState(null);
  const [incommingMessage, setIncommingMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [fullMessage, setFullMessage] = useState("");
  const router = useRouter();
  const focusInput = useRef(null);

  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
  }, [chatId]);

  useEffect(() => {
    if (!generatingResponse && fullMessage) {
      setNewChatMessages((prev) => [
        ...prev,
        {
          _id: uuid(),
          role: "assistant",
          content: fullMessage,
        },
      ]);
      setFullMessage("");
      focusInput.current.focus();
    }
  }, [generatingResponse, fullMessage]);

  useEffect(() => {
    if (!generatingResponse && newChatId) {
      setNewChatId(null);
      router.push(`/c/${newChatId}`);
    }
  }, [newChatId, generatingResponse, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneratingResponse(true);
    setNewChatMessages((prev) => {
      const newChatMessages = [
        ...prev,
        {
          _id: uuid(),
          role: "user",
          content: messageText,
        },
      ];
      return newChatMessages;
    });

    try {
      setMessageText("");
      const response = await fetch("/api/chat/sendMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId, message: messageText }),
      });
      const chatIdHeader = response.headers.get("Chat-Id");
      const reader = response.body.getReader();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunkText = new TextDecoder().decode(value);
        setIncommingMessage((prevData) => `${prevData} ${chunkText}`);
        content += chunkText;
      }
      setIncommingMessage("");
      setFullMessage(content);
      setNewChatId(chatIdHeader);
      setGeneratingResponse(false);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const allMessages = [...messages, ...newChatMessages];
  // sm:grid-cols-[260px_1fr]

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className="grid h-screen grid-cols-1  bg-[#343541] sm:grid-cols-[260px_1fr]">
        <ChatSidebar chatId={chatId} />
        <div className="flex flex-col overflow-hidden p-5">
          <SimpleBar
            forceVisible="y"
            autoHide={true}
            className=" h-full w-full overflow-x-auto rounded-md"
          >
            <div className="flex-1 overflow-auto  text-white">
              <div className=" m-auto max-w-[768px]">
                {allMessages.map((message) => (
                  <Message
                    key={message._id}
                    role={message.role}
                    content={message.content}
                  />
                ))}
                {!!incommingMessage && (
                  <Message role="assistant" content={incommingMessage} />
                )}
              </div>
            </div>
          </SimpleBar>

          <footer className="p-2 ">
            <form onSubmit={handleSubmit}>
              <fieldset
                className="relative m-auto flex max-w-[720px] "
                disabled={generatingResponse}
              >
                <textarea
                  ref={focusInput}
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                  }}
                  className="my-custom-textarea   caret-purple-[#6b7280] block h-[54px] w-full resize-none rounded-2xl border  border-gray-500 bg-[#343541] px-5 pt-4 leading-4 text-white outline-none"
                  placeholder={generatingResponse ? "" : "Message ChatGPT..."}
                />

                <button
                  type="submit"
                  className=" absolute bottom-2  right-3 top-2 rounded-md  bg-gray-600
                   p-0.5 px-3  py-[8px] text-gray-800 transition-colors disabled:bg-black disabled:text-gray-400 disabled:opacity-10 

                  "
                >
                  <FontAwesomeIcon icon={faArrowUp} />
                </button>
              </fieldset>
            </form>
          </footer>
        </div>
      </div>
    </>
  );
};

export default ChatPage;

export const getServerSideProps = async (ctx) => {
  const chatId = ctx.params?.chatId?.[0] || null;
  if (chatId) {
    const { user } = await getSession(ctx.req, ctx.res);
    const client = await clientPromise;
    const db = client.db("gpt-clone");
    const chat = await db.collection("gpt-chat").findOne({
      userId: user.sub,
      _id: new ObjectId(chatId),
    });

    return {
      props: {
        chatId,
        title: chat?.title,
        messages:
          chat?.messages?.map((message) => ({
            ...message,
            _id: uuid(),
          })) || [],
      },
    };
  }
  return {
    props: {},
  };
};

// rounded-md bg-emerald-600 px-6 py-[16px] text-white hover:bg-emerald-500 disabled:bg-emerald-300
