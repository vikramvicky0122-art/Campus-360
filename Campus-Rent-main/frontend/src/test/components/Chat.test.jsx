import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatProvider, useChat } from '../../context/ChatContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../../services/api.js';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn((event, data, callback) => {
      if (callback) callback({ success: true, data: { id: 'msg-1' } });
    }),
    connected: true,
    id: 'mock-socket-id',
    disconnect: vi.fn(),
  })),
}));

vi.mock('../../services/api.js', () => ({
  api: {
    getMyConversations: vi.fn(),
    getConversationMessages: vi.fn(),
  },
}));

vi.mock('../../services/chat.js', async () => {
  const actual = await vi.importActual('../../services/chat.js');
  return {
    ...actual,
    connectSocket: vi.fn(() => ({
      on: vi.fn(),
      emit: vi.fn(),
      connected: true,
      id: 'mock-socket-id',
      disconnect: vi.fn(),
    })),
    disconnectSocket: vi.fn(),
    sendMessage: vi.fn(),
    joinConversation: vi.fn(),
    leaveConversation: vi.fn(),
  };
});

const renderWithProviders = (ui, { user = null, token = null } = {}) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ user, token, login: vi.fn(), logout: vi.fn() }}>
        <ChatProvider>
          {ui}
        </ChatProvider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

function TestConsumer() {
  const chat = useChat();
  return (
    <div>
      <div data-testid="conversations-count">{chat.conversations.length}</div>
      <div data-testid="has-active">{chat.activeConversation ? 'yes' : 'no'}</div>
      <div data-testid="messages-count">{chat.messages.length}</div>
    </div>
  );
}

describe('ChatProvider and useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMyConversations.mockResolvedValue({ success: true, data: [] });
    api.getConversationMessages.mockResolvedValue({
      success: true,
      data: [],
      hasMore: false,
      nextCursor: null,
    });
  });

  it('should render ChatProvider without crashing', () => {
    renderWithProviders(<TestConsumer />, {
      user: { id: 'user-1', fullName: 'Test User' },
      token: 'test-token',
    });
    expect(screen.getByTestId('conversations-count')).toBeDefined();
  });

  it('should fetch conversations on mount when user is logged in', async () => {
    const mockConversations = [
      {
        id: 'conv-1',
        bookingId: 'booking-1',
        otherUser: { id: 'user-2', fullName: 'Other User' },
        lastMessage: { content: 'Hello!', createdAt: new Date().toISOString() },
      },
    ];
    api.getMyConversations.mockResolvedValue({
      success: true,
      data: mockConversations,
    });

    renderWithProviders(<TestConsumer />, {
      user: { id: 'user-1', fullName: 'Test User' },
      token: 'test-token',
    });

    await vi.waitFor(() => {
      expect(api.getMyConversations).toHaveBeenCalledTimes(1);
    });
  });

  it('should not fetch conversations when user is not logged in', () => {
    renderWithProviders(<TestConsumer />, { user: null, token: null });
    expect(api.getMyConversations).not.toHaveBeenCalled();
  });

  it('should have empty conversations by default', () => {
    renderWithProviders(<TestConsumer />, {
      user: { id: 'user-1', fullName: 'Test User' },
      token: 'test-token',
    });
    const countEl = screen.getByTestId('conversations-count');
    expect(countEl.textContent).toBe('0');
  });

  it('should export useChat hook', () => {
    expect(useChat).toBeDefined();
    expect(typeof useChat).toBe('function');
  });
});

describe('Online Presence State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMyConversations.mockResolvedValue({ success: true, data: [] });
    api.getConversationMessages.mockResolvedValue({
      success: true,
      data: [],
      hasMore: false,
      nextCursor: null,
    });
  });

  it('should initialize onlineUsers as empty object', () => {
    function PresenceConsumer() {
      const { onlineUsers } = useChat();
      return <div data-testid="presence-keys">{Object.keys(onlineUsers).length}</div>;
    }

    renderWithProviders(<PresenceConsumer />, {
      user: { id: 'user-1', fullName: 'Test User' },
      token: 'test-token',
    });

    expect(screen.getByTestId('presence-keys').textContent).toBe('0');
  });

  it('should expose onlineUsers in useChat context', () => {
    function PresenceConsumer() {
      const { onlineUsers } = useChat();
      return <div data-testid="presence-value">{JSON.stringify(onlineUsers)}</div>;
    }

    renderWithProviders(<PresenceConsumer />, {
      user: { id: 'user-1', fullName: 'Test User' },
      token: 'test-token',
    });

    expect(screen.getByTestId('presence-value').textContent).toBe('{}');
  });
});

