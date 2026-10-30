/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import { api } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

export const ListingContext = createContext(null);

export function ListingProvider({ children }) {
  const { user } = useAuth();
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  // Track current search/filter params so refreshListings can reuse them
  const searchParamsRef = useRef({});

  const mapListing = (item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    pricePerDay: item.dailyRentalRate,
    securityDeposit: item.securityDeposit,
    mrp: item.retailPrice,
    location: item.preferredPickupZone,
    images: item.images && item.images.length > 0
      ? item.images.map((img) => img.imageUrl)
      : ["purple"],
    rating: item.owner?.lenderRating || 4.8,
    reviewsCount: item.owner?.ratingsCount || 0,
    isVerified: true,
    availability: item.status === 'active' ? 'Available Now' : 'Not Available',
    dateAdded: item.createdAt,
    isHidden: item.status !== 'active'
  });

  const refreshListings = useCallback(async (signal, searchParams = {}) => {
    if (searchParams && Object.keys(searchParams).length > 0) {
      searchParamsRef.current = searchParams;
    }

    try {
      setIsLoading(true);

      const params = { ...searchParamsRef.current };
      const [globalRes, myRes] = await Promise.all([
        api.getListings(params, signal),
        user ? api.getMyListings(signal) : Promise.resolve({ data: [] })
      ]);

      setMarketplaceListings((globalRes.data || []).map(mapListing));
      if (globalRes.pagination) {
        setPagination(globalRes.pagination);
      }
      setMyListings((myRes.data || []).map(mapListing));
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error("Failed to fetch live listings:", err);
      setMarketplaceListings([]);
      setMyListings([]);
      setError(err.message || "Failed to load live listings.");
    } finally {
      if (!signal || !signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user]);

  // Initial fetch — no search params
  useEffect(() => {
    const abortController = new AbortController();
    refreshListings(abortController.signal, {});
    return () => {
      abortController.abort();
    };
  }, [refreshListings]);

  const updateListing = async (id, payload) => {
    const res = await api.updateListing(id, payload);
    if (res.success) {
      await refreshListings();
    }
    return res;
  };

  const toggleHidden = (id) => {
    setMyListings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isHidden: !item.isHidden } : item
      )
    );
  };

  const deleteListing = async (id) => {
    await api.deleteListing(id);
    await refreshListings();
  };

  return (
    <ListingContext.Provider
      value={{
        listings: marketplaceListings,
        marketplaceListings,
        myListings,
        isLoading,
        error,
        pagination,
        toggleHidden,
        deleteListing,
        updateListing,
        refreshListings
      }}
    >
      {children}
    </ListingContext.Provider>
  );
}

export const useListings = () => {
  const context = useContext(ListingContext);
  if (!context) {
    throw new Error("useListings must be used within a ListingProvider");
  }
  return context;
};
