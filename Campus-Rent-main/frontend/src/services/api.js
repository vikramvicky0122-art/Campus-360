const normalizeBaseUrl = (url) => String(url || "").trim().replace(/\/$/, "");

const resolveApiBaseUrl = () => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  const isDevelopment = import.meta.env.DEV;

  if (configured) {
    return configured;
  }

  if (isDevelopment) {
    return "http://localhost:5000/api";
  }

  throw new Error(
    "Missing VITE_API_URL. Set VITE_API_URL in your production environment."
  );
};

const API_BASE_URL = resolveApiBaseUrl();
const AUTH_TOKEN_KEY = "campus360_token";

/** @type {(() => void) | null} */
let _onAuthError = null;

/**
 * Register a callback to be invoked when the API detects an auth failure (401).
 * Intended for AuthContext to wire up auto-logout on token expiry.
 */
export const setOnAuthError = (callback) => {
  _onAuthError = typeof callback === 'function' ? callback : null;
};

const parseApiError = async (response) => {
  let message = `API Error: ${response.statusText}`;
  try {
    const body = await response.json();
    if (body?.message) {
      message = body.message;
    }
  } catch {
    // Ignore JSON parsing errors and keep status text fallback
  }

  if (response.status === 401 && _onAuthError) {
    _onAuthError();
  }

  const error = new Error(message);
  error.status = response.status;
  return error;
};

export const api = {
  get: async (endpoint, signal) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!response.ok) throw await parseApiError(response);
    return response.json();
  },

  post: async (endpoint, data) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response);
    return response.json();
  },

  patch: async (endpoint, data) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response);
    return response.json();
  },

  delete: async (endpoint) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!response.ok) throw await parseApiError(response);
    return response.json();
  },

  // Dedicated API helpers
  getListings: async (params = {}, signal) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.location) query.set('location', params.location);
    const qs = query.toString();
    return api.get(`/listings${qs ? `?${qs}` : ''}`, signal);
  },

  getListingById: async (id, signal) => {
    return api.get(`/listings/${id}`, signal);
  },

  getMyListings: async (signal) => {
    return api.get("/listings/my-listings", signal);
  },

  createListing: async (payload) => {
    return api.post("/listings", payload);
  },

  updateListing: async (id, payload) => {
    return api.patch(`/listings/${id}`, payload);
  },

  uploadListingImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    const response = await fetch(`${API_BASE_URL}/listings/upload-image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!response.ok) throw await parseApiError(response);
    return response.json();
  },

  getMyBookings: async (signal) => {
    return api.get("/bookings/my-bookings", signal);
  },

  createBooking: async (payload) => {
    return api.post("/bookings", payload);
  },

  updateBookingStatus: async (bookingId, status) => {
    return api.patch(`/bookings/${bookingId}/status`, { status });
  },

  deleteListing: async (id) => {
    return api.delete(`/listings/${id}`);
  },

  signup: async (payload) => {
    return api.post("/auth/signup", payload);
  },

  login: async (payload) => {
    return api.post("/auth/login", payload);
  },

  // ── Conversations ──────────────────────────────────────────────
  getMyConversations: async (signal) => {
    return api.get("/conversations", signal);
  },

  getConversationMessages: async (conversationId, cursor, signal) => {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return api.get(`/conversations/${conversationId}/messages${params}`, signal);
  },

  markConversationRead: async (conversationId) => {
    return api.patch(`/conversations/${conversationId}/read`);
  }
};
