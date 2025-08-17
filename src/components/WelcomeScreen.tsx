import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface WelcomeScreenProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export const WelcomeScreen = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
}: WelcomeScreenProps) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [error, setError] = useState('');

  // These should call your Netlify serverless functions
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/.netlify/functions/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

      const data = await res.json();
      if (data.user) setUser(data.user);
      else setError(data.error || 'Auth failed');
    } catch (err) {
      setError('Network error');
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center flex-1 px-4">
        <div className="w-full max-w-md mx-auto text-center">
          <h1 className="mb-4 text-4xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
            <span className="text-white">Abxy</span> Chat
          </h1>
          <div className="mb-4">
            <button
              className={`px-4 py-2 mr-2 rounded ${authMode === 'login' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={`px-4 py-2 rounded ${authMode === 'signup' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
              onClick={() => setAuthMode('signup')}
            >
              Sign Up
            </button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-orange-500/20"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-orange-500/20"
            />
            <button
              type="submit"
              className="w-full py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
            {error && <div className="text-red-500">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  // Only authorized user sees their chat
  return (
    <div className="flex items-center justify-center flex-1 px-4">
      <div className="w-full max-w-3xl mx-auto text-center">
        <h1 className="mb-4 text-6xl font-bold text-transparent uppercase bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text">
          <span className="text-white">Abxy</span> Chat
        </h1>
        <p className="w-2/3 mx-auto mb-6 text-lg text-gray-400">
          Welcome, {user.email}! You can ask me about anything.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="relative max-w-xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type something clever (or don't, we won't judge)..."
              className="w-full py-3 pl-4 pr-12 overflow-hidden text-sm text-white placeholder-gray-400 border rounded-lg resize-none border-orange-500/20 bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
              rows={1}
              style={{ minHeight: '88px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute p-2 text-orange-500 transition-colors -translate-y-1/2 right-2 top-1/2 hover:text-orange-400 disabled:text-gray-500 focus:outline-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};