import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingCard from '../../components/ListingCard';

const baseItem = {
  id: 'l1',
  name: 'Canon Camera',
  price: 'Rs 2500',
  status: 'Available',
  isHidden: false,
  image: 'blue',
  upcoming: [],
};

const defaultCallbacks = {
  onEdit: vi.fn(),
  onToggleHidden: vi.fn(),
  onDelete: vi.fn(),
};

describe('ListingCard', () => {
  it('renders item name and price', () => {
    render(<ListingCard item={baseItem} {...defaultCallbacks} />);
    expect(screen.getByText('Canon Camera')).toBeInTheDocument();
    expect(screen.getByText('Rs 2500/day')).toBeInTheDocument();
  });

  it('shows Available badge and no upcoming text when no reservations', () => {
    render(<ListingCard item={baseItem} {...defaultCallbacks} />);
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('No upcoming reservations yet.')).toBeInTheDocument();
  });

  it('shows upcoming reservation info when present', () => {
    const itemWithUpcoming = {
      ...baseItem,
      nextReservation: { dates: 'May 1 - May 5', renter: 'Alex R.' },
    };
    render(<ListingCard item={itemWithUpcoming} {...defaultCallbacks} />);
    expect(screen.getByText(/Upcoming reservation:/)).toBeInTheDocument();
    expect(screen.getByText(/Alex R./)).toBeInTheDocument();
  });

  it('shows Rented status and renter info when rented', () => {
    const rentedItem = {
      ...baseItem,
      status: 'Rented',
      currentRental: { renter: 'Sam P.', dates: 'Apr 20 - Apr 25', status: 'ongoing' },
    };
    render(<ListingCard item={rentedItem} {...defaultCallbacks} />);
    expect(screen.getByText('Rented')).toBeInTheDocument();
    expect(screen.getByText(/Sam P./)).toBeInTheDocument();
    expect(screen.getByText(/Active rental:/)).toBeInTheDocument();
  });

  it('shows Confirm Return button when return is pending', () => {
    const returnPendingItem = {
      ...baseItem,
      status: 'Rented',
      currentRental: { renter: 'Sam P.', dates: 'Apr 20 - Apr 25', status: 'return_pending' },
    };
    render(<ListingCard item={returnPendingItem} {...defaultCallbacks} />);
    expect(screen.getByText('Confirm Return')).toBeInTheDocument();
  });

  it('shows Hidden badge when item is hidden', () => {
    render(<ListingCard item={{ ...baseItem, isHidden: true }} {...defaultCallbacks} />);
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('shows "Unhide Listing" text when item is hidden', () => {
    render(<ListingCard item={{ ...baseItem, isHidden: true }} {...defaultCallbacks} />);
    expect(screen.getByText('Unhide Listing')).toBeInTheDocument();
  });

  it('shows "Hide Listing" text when item is visible', () => {
    render(<ListingCard item={baseItem} {...defaultCallbacks} />);
    expect(screen.getByText('Hide Listing')).toBeInTheDocument();
  });

  it('calls onEdit when Edit Listing button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<ListingCard item={baseItem} {...defaultCallbacks} onEdit={onEdit} />);
    await user.click(screen.getByText('Edit Listing'));
    expect(onEdit).toHaveBeenCalledWith(baseItem);
  });

  it('calls onDelete when Delete Listing button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<ListingCard item={baseItem} {...defaultCallbacks} onDelete={onDelete} />);
    await user.click(screen.getByText('Delete Listing'));
    expect(onDelete).toHaveBeenCalledWith(baseItem);
  });

  it('calls onConfirmReturn when Confirm Return button is clicked', async () => {
    const onConfirmReturn = vi.fn();
    const user = userEvent.setup();
    const returnPendingItem = {
      ...baseItem,
      status: 'Rented',
      currentRental: { renter: 'Sam P.', dates: 'Apr 20 - Apr 25', status: 'return_pending' },
    };
    render(<ListingCard item={returnPendingItem} {...defaultCallbacks} onConfirmReturn={onConfirmReturn} />);
    await user.click(screen.getByText('Confirm Return'));
    expect(onConfirmReturn).toHaveBeenCalledWith(returnPendingItem);
  });

  it('renders upcoming queue with Mark Given and Cancel buttons', () => {
    const itemWithUpcoming = {
      ...baseItem,
      upcoming: [
        { id: 'u1', dates: 'May 1 - May 5', renter: 'Alex R.', status: 'approved' },
      ],
    };
    render(<ListingCard item={itemWithUpcoming} {...defaultCallbacks} />);
    expect(screen.getByText(/Upcoming queue/)).toBeInTheDocument();
    expect(screen.getByText('Mark Given')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
