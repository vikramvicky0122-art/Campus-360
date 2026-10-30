import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ListingContext } from '../../context/ListingContext';
import Landing from '../../pages/Landing';

const createListingContext = (overrides = {}) => ({
  listings: [],
  marketplaceListings: [],
  myListings: [],
  isLoading: false,
  error: null,
  pagination: null,
  toggleHidden: vi.fn(),
  deleteListing: vi.fn(),
  updateListing: vi.fn(),
  refreshListings: vi.fn(),
  ...overrides,
});

const renderLanding = (contextValue) =>
  render(
    <BrowserRouter>
      <ListingContext value={contextValue}>
        <Landing />
      </ListingContext>
    </BrowserRouter>
  );

describe('Landing Page', () => {
  it('renders hero section with headline', () => {
    renderLanding(createListingContext());
    expect(screen.getByText(/Rent From Peers/)).toBeInTheDocument();
  });

  it('renders Explore Marketplace and Lend Your Gear CTAs', () => {
    renderLanding(createListingContext());
    expect(screen.getByText('Explore Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Lend Your Gear')).toBeInTheDocument();
  });

  it('renders featured section heading', () => {
    renderLanding(createListingContext());
    expect(screen.getByText('Featured listings')).toBeInTheDocument();
  });

  it('renders Why Campus 360 section', () => {
    renderLanding(createListingContext());
    expect(screen.getByText('Everything you need to rent smarter')).toBeInTheDocument();
  });

  it('renders categories section', () => {
    renderLanding(createListingContext());
    expect(screen.getByText('Curated collections')).toBeInTheDocument();
  });

  it('renders trust section', () => {
    renderLanding(createListingContext());
    expect(screen.getByText('Every rental is protected from checkout to return')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    renderLanding(createListingContext());
    expect(screen.getByText('Ready to join your campus circle?')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading', () => {
    renderLanding(createListingContext({ isLoading: true }));
    // In loading state, the skeleton divs should be present
    const skeletons = document.querySelectorAll('.marketplace-card.skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders real items when listings are available', () => {
    const mockListings = [
      {
        id: '1',
        title: 'Test Item',
        pricePerDay: 500,
        images: ['blue'],
        location: 'Test Location',
        rating: 4.5,
        reviewsCount: 10,
        isVerified: true,
        availability: 'Available Now',
        dateAdded: new Date().toISOString(),
      },
    ];
    renderLanding(
      createListingContext({ marketplaceListings: mockListings, isLoading: false })
    );
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });
});
