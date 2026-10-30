import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ItemCard from '../../components/ItemCard';

const baseItem = {
  id: 'm1',
  title: 'MacBook Pro M2',
  pricePerDay: 1500,
  location: 'Arts District',
  rating: 4.9,
  reviewsCount: 32,
  isVerified: true,
  images: ['blue'],
  availability: 'Available Now'
};

const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('ItemCard', () => {
  it('renders item title and location', () => {
    renderWithRouter(<ItemCard item={baseItem} />);
    expect(screen.getByText('MacBook Pro M2')).toBeInTheDocument();
    expect(screen.getByText('Arts District')).toBeInTheDocument();
  });

  it('renders price with / day suffix', () => {
    renderWithRouter(<ItemCard item={baseItem} />);
    expect(screen.getByText('Rs 1500')).toBeInTheDocument();
    expect(screen.getByText('/ day')).toBeInTheDocument();
  });

  it('shows Verified badge for verified items', () => {
    renderWithRouter(<ItemCard item={baseItem} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows Featured badge for non-verified items', () => {
    renderWithRouter(<ItemCard item={{ ...baseItem, isVerified: false }} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('disables Rent Now button when item is hidden', () => {
    renderWithRouter(<ItemCard item={{ ...baseItem, isHidden: true }} />);
    expect(screen.getByRole('button', { name: 'Rent Now' })).toBeDisabled();
  });

  it('disables Rent Now button when availability is "Not Available"', () => {
    renderWithRouter(<ItemCard item={{ ...baseItem, availability: 'Not Available' }} />);
    expect(screen.getByRole('button', { name: 'Rent Now' })).toBeDisabled();
  });

  it('enables Rent Now button when available', () => {
    renderWithRouter(<ItemCard item={baseItem} />);
    expect(screen.getByRole('button', { name: 'Rent Now' })).not.toBeDisabled();
  });

  it('renders rating and review count', () => {
    renderWithRouter(<ItemCard item={baseItem} />);
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('(32)')).toBeInTheDocument();
  });

  it('shows (0) when no reviews', () => {
    renderWithRouter(<ItemCard item={{ ...baseItem, reviewsCount: 0 }} />);
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  it('shows rented until label when item is currently rented', () => {
    const rentedItem = { ...baseItem, rentedUntil: '2026-05-15' };
    renderWithRouter(<ItemCard item={rentedItem} />);
    expect(screen.getByText(/Rented until/)).toBeInTheDocument();
  });

  it('does not show rented until label when not rented', () => {
    renderWithRouter(<ItemCard item={baseItem} />);
    expect(screen.queryByText(/Rented until/)).not.toBeInTheDocument();
  });

  it('has correct aria-label for accessibility', () => {
    renderWithRouter(<ItemCard item={baseItem} />);
    expect(screen.getByRole('button', { name: /View details for MacBook Pro M2/ })).toBeInTheDocument();
  });

  it('renders fallback for items without pricePerDay', () => {
    renderWithRouter(<ItemCard item={{ ...baseItem, pricePerDay: 0 }} />);
    expect(screen.queryByText('Rs')).not.toBeInTheDocument();
  });
});
