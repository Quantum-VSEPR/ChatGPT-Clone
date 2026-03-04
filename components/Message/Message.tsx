"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Copy from "lucide-react/dist/esm/icons/copy";
import { motion } from "framer-motion";

export const Message = ({
  role,
  content,
}: {
  role: string;
  content: string;
}) => {
  const isUser = role === "user";

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`mb-6 flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      {isUser ? (
        <div className="max-w-[75%] rounded-3xl bg-[#2f2f2f] px-5 py-2.5 text-[15px] leading-relaxed text-gray-100">
          {content}
        </div>
      ) : (
        <div className="w-full max-w-full pl-2">
          <div className="prose prose-invert max-w-none text-[15px] leading-relaxed text-gray-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
          <div className="mt-3 flex items-center gap-1 text-gray-400">
            <button
              onClick={() => copyToClipboard(content)}
              className="rounded-lg p-1.5 transition-colors hover:bg-[#2f2f2f]"
              title="Copy response"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
