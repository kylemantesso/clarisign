import React, { useState } from "react";
import axios from "axios";
import { MessageList, Input, Button } from "react-chat-elements";
import "react-chat-elements/dist/main.css";

interface ChatMessage {
  type: "text";
  position: "left" | "right";
  text: string;
  date: Date;
}

const ChatComponent = ({
                         envelopeId,
                         type,
                       }: {
  envelopeId: string;
  type: "dyslexia" | "vision_impairment" | "neurodivergent";
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      type: "text",
      position: "right",
      text: input,
      date: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await axios.post(
        "/api/chat",
        { query: input, envelopeId, type },
        { headers: { "Content-Type": "application/json" } }
      );

      const aiMessage = {
        type: "text",
        position: "left",
        text: response.data.answer,
        date: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error fetching response:", error);
      const errorMessage = {
        type: "text",
        position: "left",
        text: "Something went wrong. Please try again.",
        date: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Chat messages */}
      <div className="flex-grow overflow-y-auto p-4">
        <MessageList
          className="message-list"
          lockable={true}
          toBottomHeight={"100%"}
          dataSource={messages}
        />
      </div>

      {/* Input area anchored to the bottom */}
      <div className="flex border-gray-300 bg-white">
        <div className="w-full">
        <Input
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className=" py-2 border rounded-lg" // Limit input width
        />
        </div>
        <Button
          text="Send"
          onClick={handleSend}
          className="bg-blue-600 text-white rounded-lg"
        />
      </div>
    </div>
  );
};

export default ChatComponent;
