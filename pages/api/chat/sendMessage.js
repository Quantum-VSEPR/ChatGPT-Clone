import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const initialChatMessage = {
    role: "system",
    content:
      'Your name is Dammat. An incredibly inteligent and "quick-thinking AI", that always replies with an enthusiastic and positive energy. You were created by DMT. Your response must be formated as markdown and dont use h1 when you answer their font is so large',
  };
  try {
    const { chatId: chatIdFromParam, message } = req.body;
    let chatId = chatIdFromParam;
    let newChatId;
    let chatMessages = [];
    if (chatId) {
      const response = await fetch(
        `${req.headers.origin}/api/chat/addMessageToChat`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: req.headers.cookie,
          },
          body: JSON.stringify({
            chatId,
            role: "user",
            content: message,
          }),
        }
      );
      const json = await response.json();
      chatMessages = json.chat.messages || [];
    } else {
      const response = await fetch(
        `${req.headers.origin}/api/chat/createNewChat`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: req.headers.cookie,
          },
          body: JSON.stringify({ message }),
        }
      );

      const json = await response.json();

      chatId = json._id;
      newChatId = json._id;
      chatMessages = json.messages || [];
      res.setHeader("Chat-Id", newChatId);
    }

    const messagesToInclude = [];
    chatMessages.reverse();

    let usedTokens = 0;
    for (let chatMessage of chatMessages) {
      const messageTokens = chatMessage.content.length / 4;
      usedTokens = usedTokens + messageTokens;
      if (usedTokens <= 2000) {
        messagesToInclude.push(chatMessage);
      } else {
        break;
      }
    }

    messagesToInclude.reverse();
    res.setHeader("Content-Type", "text/plain");

    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [...messagesToInclude],
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const streamedData = chunk.choices[0]?.delta?.content || "";
      if (streamedData.trim() !== "") {
        res.write(streamedData);
        fullContent += streamedData;
      }
    }

    await fetch(`${req.headers.origin}/api/chat/addMessageToChat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: req.headers.cookie,
      },
      body: JSON.stringify({
        chatId,
        role: "assistant",
        content: fullContent,
      }),
    });

    res.end();
  } catch (e) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
