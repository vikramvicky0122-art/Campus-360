import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompletedRentalCard from '../../components/CompletedRentalCard';

const baseRental = {
  id: 'c1',
  name: 'DJI Mini 3 Drone',
  owner: 'Alex Rivera',
  image: 'blue',
  dates: 'Mar 30 - Apr 3',
  returned: 'Apr 04',
  statusLabel: 'Completed',
};

describe('CompletedRentalCard', () => {
  it('renders item name and owner', () => {
    render(<CompletedRentalCard rental={baseRental} />);
    expect(screen.getByText('DJI Mini 3 Drone')).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera/)).toBeInTheDocument();
  });

  it('shows Completed badge and return date for completed items', () => {
    render(<CompletedRentalCard rental={baseRental} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText(/Returned on Apr 04/)).toBeInTheDocument();
  });

  it('shows Rate Owner button for completed items', () => {
    render(<CompletedRentalCard rental={baseRental} />);
    expect(screen.getByText('Rate Owner')).toBeInTheDocument();
  });

  it('calls onRateOwner when Rate Owner button is clicked', async () => {
    const onRateOwner = vi.fn();
    const user = userEvent.setup();
    render(<CompletedRentalCard rental={baseRental} onRateOwner={onRateOwner} />);
    await user.click(screen.getByText('Rate Owner'));
    expect(onRateOwner).toHaveBeenCalledWith(baseRental);
  });

  it('shows Cancelled badge and cancelled by text', () => {
    render(
      <CompletedRentalCard
        rental={{ ...baseRental, statusLabel: 'Cancelled', cancelledBy: 'Ravi Malhotra' }}
      />
    );
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText(/Cancelled by Ravi Malhotra/)).toBeInTheDocument();
  });

  it('shows Rejected badge and rejection text', () => {
    render(<CompletedRentalCard rental={{ ...baseRental, statusLabel: 'Rejected' }} />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText(/Request was rejected/)).toBeInTheDocument();
  });

  it('does not show Rate Owner for cancelled or rejected items', () => {
    render(<CompletedRentalCard rental={{ ...baseRental, statusLabel: 'Cancelled' }} />);
    expect(screen.queryByText('Rate Owner')).not.toBeInTheDocument();
  });

  it('renders booking dates', () => {
    render(<CompletedRentalCard rental={baseRental} />);
    expect(screen.getByText(/Mar 30 - Apr 3/)).toBeInTheDocument();
  });

  it('renders fallback "Cancelled by borrower" when cancelledBy is null', () => {
    render(
      <CompletedRentalCard rental={{ ...baseRental, statusLabel: 'Cancelled', cancelledBy: null }} />
    );
    expect(screen.getByText(/Cancelled by borrower/)).toBeInTheDocument();
  });
});
