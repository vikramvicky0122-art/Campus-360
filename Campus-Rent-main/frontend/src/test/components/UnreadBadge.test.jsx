import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ChatProvider, useChat } from '../../context/ChatContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../../services/api.js';

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
    markConversationRead: vi.fn(),
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

const mockUser = { id: 'user-1', fullName: 'Test User' };
const mockToken = 'test-token';

const renderWithProviders = (ui, { user = mockUser, token = mockToken } = {}) => {
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

const mockConversations = [
  {
    id: 'conv-1',
    bookingId: 'booking-1',
    otherUser: { id: 'user-2', fullName: 'Other User' },
    lastMessage: { content: 'Hello!', createdAt: new Date().toISOString(), senderId: 'user-2' },
    unreadCount: 3,
  },
  {
    id: 'conv-2',
    bookingId: 'booking-2',
    otherUser: { id: 'user-3', fullName: 'Third User' },
    lastMessage: null,
    unreadCount: 0,
  },
];

function UnreadConsumer() {
  const chat = useChat();
  return (
    <div>
      <div data-testid="unread-counts">{JSON.stringify(chat.unreadCounts)}</div>
      <div data-testid="active-conversation-id">{chat.activeConversationId || 'none'}</div>
      <button
        data-testid="select-conv"
        onClick={() => chat.selectConversation('conv-1')}
      >
        Select Conv 1
      </button>
      <ul>
        {chat.conversations.map((c) => (
          <li key={c.id} data-testid={`conv-${c.id}`}>
            {c.otherUser?.fullName}
            {(chat.unreadCounts[c.id] || 0) > 0 && (
              <span data-testid={`badge-${c.id}`} className="chat-unread-badge">
                {chat.unreadCounts[c.id]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('Unread Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMyConversations.mockResolvedValue({
      success: true,
      data: mockConversations,
    });
    api.getConversationMessages.mockResolvedValue({
      success: true,
      data: [],
      hasMore: false,
      nextCursor: null,
    });
    api.markConversationRead.mockResolvedValue({
      success: true,
      data: { unreadCount: 0 },
    });
  });

  it('should render unread badge when unreadCount > 0', async () => {
    renderWithProviders(<UnreadConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('badge-conv-1')).toBeDefined();
    });

    const badge = screen.getByTestId('badge-conv-1');
    expect(badge.textContent).toBe('3');
  });

  it('should NOT render badge when unreadCount is 0', async () => {
    renderWithProviders(<UnreadConsumer />);

    await waitFor(() => {
      expect(api.getMyConversations).toHaveBeenCalled();
    });

    const badge = screen.queryByTestId('badge-conv-2');
    expect(badge).toBeNull();
  });

  it('should clear unread badge when conversation is selected', async () => {
    renderWithProviders(<UnreadConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('badge-conv-1')).toBeDefined();
    });

    const selectBtn = screen.getByTestId('select-conv');
    await act(async () => {
      fireEvent.click(selectBtn);
    });

    await waitFor(() => {
      expect(api.markConversationRead).toHaveBeenCalledWith('conv-1');
    });

    const badgeAfter = screen.queryByTestId('badge-conv-1');
    expect(badgeAfter).toBeNull();
  });

  it('should update unread counts from API response on mount', async () => {
    renderWithProviders(<UnreadConsumer />);

    await waitFor(() => {
      const el = screen.getByTestId('unread-counts');
      const counts = JSON.parse(el.textContent);
      expect(counts['conv-1']).toBe(3);
      expect(counts['conv-2']).toBe(0);
    });
  });

  it('should track unreadCounts as an object', async () => {
    renderWithProviders(<UnreadConsumer />);

    await waitFor(() => {
      const el = screen.getByTestId('unread-counts');
      const counts = JSON.parse(el.textContent);
      expect(typeof counts).toBe('object');
      expect(counts).not.toBeNull();
    });
  });
});
