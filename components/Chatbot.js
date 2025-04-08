import { useState } from "react";

export default function Chatbot({ apiEndpoint }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // NEW

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);

    // Show loading placeholder
    const loadingMsg = { role: "bot", text: "🤖 AI is generating a response..." };
    setMessages((prev) => [...prev, loadingMsg]);
    setLoading(true);

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      // Replace the loading message with the actual reply
      setMessages((prev) => [
        ...prev.slice(0, -1), // remove last loading message
        { role: "bot", text: data.reply }
      ]);
    } catch (error) {
      console.error("API Error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "bot", text: "⚠️ Sorry, something went wrong. Please try again." }
      ]);
    }

    setInput("");
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg h-full flex flex-col max-h-[550px] border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-3">💬 Chat with AI</h2>
      <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-md">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-2 rounded-lg text-sm max-w-xs ${
              msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-900"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex mt-3">
        <input
          type="text"
          className="flex-1 border border-gray-300 p-2 rounded-lg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          disabled={loading} // Prevent user typing during processing
        />
        <button
          onClick={sendMessage}
          className={`ml-2 px-4 py-2 rounded-lg transition text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          disabled={loading}
        >
          {loading ? "Wait..." : "Send"}
        </button>
      </div>
    </div>
  );
}
