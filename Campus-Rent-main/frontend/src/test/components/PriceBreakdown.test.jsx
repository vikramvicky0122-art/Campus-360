import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PriceBreakdown from '../../components/PriceBreakdown';

const defaultProps = {
  totalDays: 3,
  pricePerDay: 500,
  securityDeposit: 2000,
  serviceFee: 50,
  finalTotal: 3550,
  isValid: true,
  onConfirm: vi.fn(),
  primaryText: 'Confirm Booking'
};

describe('PriceBreakdown', () => {
  it('renders total amount correctly for valid dates', () => {
    render(<PriceBreakdown {...defaultProps} />);
    expect(screen.getByText('₹3550')).toBeInTheDocument();
  });

  it('renders per-day breakdown', () => {
    render(<PriceBreakdown {...defaultProps} />);
    expect(screen.getByText(/₹500 × 3 days/)).toBeInTheDocument();
    expect(screen.getByText('₹1500')).toBeInTheDocument();
  });

  it('shows security deposit and service fee', () => {
    render(<PriceBreakdown {...defaultProps} />);
    expect(screen.getByText(/Security Deposit/)).toBeInTheDocument();
    expect(screen.getByText('₹2000')).toBeInTheDocument();
    expect(screen.getByText('₹50')).toBeInTheDocument();
  });

  it('displays placeholder text when no dates selected', () => {
    render(<PriceBreakdown {...defaultProps} totalDays={0} finalTotal={0} isValid={false} />);
    expect(screen.getByText(/Select valid dates/)).toBeInTheDocument();
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });

  it('disables confirm button when isValid is false', () => {
    render(<PriceBreakdown {...defaultProps} isValid={false} />);
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).toBeDisabled();
  });

  it('enables confirm button when isValid is true', () => {
    render(<PriceBreakdown {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).not.toBeDisabled();
  });

  it('calls onConfirm when button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<PriceBreakdown {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('renders cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<PriceBreakdown {...defaultProps} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('does not render cancel button when onCancel is not provided', () => {
    render(<PriceBreakdown {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /Cancel/ })).not.toBeInTheDocument();
  });

  it('shows custom primary text', () => {
    render(<PriceBreakdown {...defaultProps} primaryText="Request to Book" />);
    expect(screen.getByRole('button', { name: 'Request to Book' })).toBeInTheDocument();
  });

  it('renders total as ₹0 when no dates selected', () => {
    render(<PriceBreakdown {...defaultProps} totalDays={0} finalTotal={0} isValid={false} />);
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });

  it('shows security deposit refund note', () => {
    render(<PriceBreakdown {...defaultProps} />);
    expect(screen.getByText(/Security deposit will be refunded/)).toBeInTheDocument();
  });
});
