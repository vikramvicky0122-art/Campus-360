import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemInfo from '../../components/ItemInfo';

const baseItem = {
  title: 'MacBook Pro M2',
  pricePerDay: 1500,
  rating: 4.9,
  reviewsCount: 32,
  isVerified: true,
  location: 'Arts District',
  category: 'Tech',
  description: 'Like-new MacBook Pro M2, perfect for programming.',
  availability: 'Available Now',
};

describe('ItemInfo', () => {
  it('renders item title', () => {
    render(<ItemInfo item={baseItem} />);
    expect(screen.getByText('MacBook Pro M2')).toBeInTheDocument();
  });

  it('renders price per day', () => {
    render(<ItemInfo item={baseItem} />);
    expect(screen.getByText('₹1500')).toBeInTheDocument();
    expect(screen.getByText('/ day')).toBeInTheDocument();
  });

  it('shows Verified Student badge for verified items', () => {
    render(<ItemInfo item={baseItem} />);
    expect(screen.getByText('Verified Student')).toBeInTheDocument();
  });

  it('shows Student Listing badge for non-verified items', () => {
    render(<ItemInfo item={{ ...baseItem, isVerified: false }} />);
    expect(screen.getByText('Student Listing')).toBeInTheDocument();
  });

  it('renders rating and review count', () => {
    render(<ItemInfo item={baseItem} />);
    expect(screen.getByText(/4.9/)).toBeInTheDocument();
    expect(screen.getByText(/32 reviews/)).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<ItemInfo item={baseItem} />);
    expect(screen.getByText(/Like-new MacBook Pro M2/)).toBeInTheDocument();
  });

  it('shows category and availability', () => {
    render(<ItemInfo item={baseItem} />);
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Available Now')).toBeInTheDocument();
  });

  it('shows fallback text when no description', () => {
    render(<ItemInfo item={{ ...baseItem, description: '' }} />);
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });

  it('shows location', () => {
    render(<ItemInfo item={baseItem} />);
    expect(screen.getByText(/Arts District/)).toBeInTheDocument();
  });
});
