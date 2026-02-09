export async function sendChatMessage(
  mode: Mode,
  message: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, message, history }),
    });

    const text = await res.text();

    if (!res.ok) {
      return text; // 👈 SHOW REAL SERVER ERROR
    }

    const data = JSON.parse(text);
    return data.reply || "No response.";
  } catch (e: any) {
    return "Client error: " + e.message;
  }
}
