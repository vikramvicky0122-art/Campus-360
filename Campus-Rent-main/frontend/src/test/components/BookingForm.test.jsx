import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingForm from '../../components/BookingForm';

describe('BookingForm', () => {
  it('renders date input fields', () => {
    render(<BookingForm />);
    const dateInputs = screen.getAllByDisplayValue('');
    // There are 2 date inputs with empty values
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onStartChange when pickup date changes', () => {
    const onStartChange = vi.fn();
    render(<BookingForm startDate="2026-05-01" onStartChange={onStartChange} />);
    const input = screen.getByDisplayValue('2026-05-01');
    fireEvent.change(input, { target: { value: '2026-05-02' } });
    expect(onStartChange).toHaveBeenCalledWith('2026-05-02');
  });

  it('calls onEndChange when return date changes', () => {
    const onEndChange = vi.fn();
    render(<BookingForm endDate="2026-05-10" onEndChange={onEndChange} />);
    const input = screen.getByDisplayValue('2026-05-10');
    fireEvent.change(input, { target: { value: '2026-05-15' } });
    expect(onEndChange).toHaveBeenCalledWith('2026-05-15');
  });

  it('displays error message when error prop is provided', () => {
    render(<BookingForm error="Return date cannot be before pickup date." />);
    expect(screen.getByText(/Return date cannot be before pickup date/)).toBeInTheDocument();
  });

  it('does not display error when no error', () => {
    render(<BookingForm />);
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  it('shows rental duration when totalDays > 0 and no error', () => {
    render(<BookingForm totalDays={3} />);
    expect(screen.getByText(/3 days/)).toBeInTheDocument();
  });

  it('shows singular "day" for 1 day', () => {
    render(<BookingForm totalDays={1} />);
    expect(screen.getByText('Rental duration: 1 day')).toBeInTheDocument();
  });

  it('hides rental duration when there is an error', () => {
    render(<BookingForm totalDays={3} error="Overlapping booking." />);
    expect(screen.queryByText(/Rental duration/)).not.toBeInTheDocument();
  });
});
