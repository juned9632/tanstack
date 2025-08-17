import React, { useEffect, useState, useRef } from "react";
import nhost from "./nhost";
import { Send } from "lucide-react";
import { useAuthenticationStatus } from "@nhost/react";

interface WelcomeScreenProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>; // kept for compatibility; we'll override local submit
  isLoading: boolean;
}

type Message = {
  id: string;
  content: string;
  created_at: string;
  user: { email?: string } | null;
};

export const WelcomeScreen = ({
  input,
  setInput,
  handleSubmit, // not used but kept for API parity
  isLoading,
}: WelcomeScreenProps) => {
  const { isAuthenticated } = useAuthenticationStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Fetch last 50 messages
  const fetchMessages = async () => {
    try {
      const GET_MESSAGES = `
        query GetMessages {
          messages(order_by: { created_at: asc }, limit: 200) {
            id
            content
            created_at
            user {
              email
            }
          }
        }
      `;
      const resp = await nhost.graphql.request(GET_MESSAGES);
      if (resp.data?.messages) {
        setMessages(resp.data.messages);
      } else {
        // GraphQL may return errors
        if (resp.errors) console.error("GraphQL errors:", resp.errors);
      }
    } catch (err) {
      console.error("Fetch messages error", err);
    }
  };

  // Polling for new messages (every 2s). Clean up on unmount.
  useEffect(() => {
    // Start polling only when authenticated
    if (!isAuthenticated) return;
    fetchMessages();
    pollRef.current = window.setInterval(fetchMessages, 2000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Auth handler using nhost
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (authMode === "signup") {
        const { error: signUpError } = await nhost.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        // optional: auto sign-in after sign-up (nhost may auto sign-in depending on settings)
        const { error: signInError } = await nhost.auth.signIn({ email, password });
        if (signInError) setError(signInError.message);
      } else {
        const { error: signInError } = await nhost.auth.signIn({ email, password });
        if (signInError) setError(signInError.message);
      }
    } catch (err) {
      console.error(err);
      setError("Network error or invalid request");
    }
  };

  const currentUser = nhost.auth.getUser();

  // Send message -> insert into messages table via GraphQL
  const localHandleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input?.trim()) return;
    if (!isAuthenticated || !currentUser) {
      setError("You must be signed in to send messages.");
      return;
    }
    setSending(true);
    try {
      const INSERT_MESSAGE = `
        mutation InsertMessage($userId: uuid!, $content: String!) {
          insert_messages_one(object: { user_id: $userId, content: $content }) {
            id
            content
            created_at
          }
        }
      `;
      const variables = {
        userId: currentUser.id,
        content: input.trim(),
      };

      const resp = await nhost.graphql.request(INSERT_MESSAGE, variables);

      if (resp.errors) {
        console.error("GraphQL insert errors:", resp.errors);
        setError("Failed to send message.");
      } else {
        setInput(""); // clear input
        // Optionally optimistically append message to UI
        // fetchMessages() will pick it up on next poll
      }
    } catch (err) {
      console.error("send message error", err);
      setError("Network error while sending message.");
    } finally {
      setSending(false);
    }
  };

  // If not authenticated, show auth UI
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center flex-1 px-4">
        <div className="w-full max-w-md mx-auto text-center">
          <h1 className="mb-4 text-4xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
            <span className="text-white">Abxy</span> Chat
          </h1>
          <div className="mb-4">
            <button
              className={`px-4 py-2 mr-2 rounded ${authMode === "login" ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-300"}`}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={`px-4 py-2 rounded ${authMode === "signup" ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-300"}`}
              onClick={() => setAuthMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-orange-500/20"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-orange-500/20"
            />
            <button type="submit" className="w-full py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
              {authMode === "login" ? "Login" : "Sign Up"}
            </button>
            {error && <div className="text-red-500">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  // Authenticated UI: chat + messages
  return (
    <div className="flex items-center justify-center flex-1 px-4">
      <div className="w-full max-w-3xl mx-auto text-center">
        <h1 className="mb-4 text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
          <span className="text-white">Abxy</span> Chat
        </h1>
        <p className="w-2/3 mx-auto mb-6 text-lg text-gray-400">
          Welcome, {currentUser?.email}! You can ask me about anything.
        </p>

        <div className="mb-6">
          <div className="max-h-96 overflow-auto bg-gray-900/40 border border-orange-500/10 p-4 rounded-lg text-left">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-400">No messages yet. Say something!</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="mb-3">
                  <div className="text-xs text-gray-400">{m.user?.email ?? "Unknown"} • {new Date(m.created_at).toLocaleTimeString()}</div>
                  <div className="px-3 py-2 bg-gray-800/60 inline-block rounded-md text-white text-sm">{m.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); localHandleSubmit(); }}>
          <div className="relative max-w-xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  localHandleSubmit();
                }
              }}
              placeholder="Type something clever (or don't, we won't judge)..."
              className="w-full py-3 pl-4 pr-12 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
              rows={1}
              style={{ minHeight: "88px" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || isLoading}
              onClick={() => localHandleSubmit()}
              className="absolute p-2 text-orange-500 transition-colors -translate-y-1/2 right-2 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-4">
          <button
            onClick={async () => {
              await nhost.auth.signOut();
              setMessages([]);
            }}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded"
          >
            Sign out
          </button>
        </div>

        {error && <div className="mt-4 text-red-400">{error}</div>}
      </div>
    </div>
  );
};

export default WelcomeScreen;
