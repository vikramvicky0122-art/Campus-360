import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApprovalCard from '../../components/ApprovalCard';
import { BOOKING_STATUS } from '../../constants/bookingStatus';

const defaultApproval = {
  id: 'b1',
  title: 'MacBook Pro M2',
  requester: 'Alex Rivera',
  dates: 'Apr 18 - Apr 21',
};

describe('ApprovalCard', () => {
  it('renders title, requester name, and dates', () => {
    render(<ApprovalCard approval={defaultApproval} />);
    expect(screen.getByText('MacBook Pro M2')).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera/)).toBeInTheDocument();
    expect(screen.getByText(/Apr 18 - Apr 21/)).toBeInTheDocument();
  });

  it('shows Approve and Reject buttons when status is not approved', () => {
    render(<ApprovalCard approval={defaultApproval} />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('calls onApprove when Approve button is clicked', async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    render(<ApprovalCard approval={defaultApproval} onApprove={onApprove} />);
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledWith(defaultApproval);
  });

  it('calls onReject when Reject button is clicked', async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(<ApprovalCard approval={defaultApproval} onReject={onReject} />);
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledWith(defaultApproval);
  });

  it('shows Approved badge instead of buttons when status is approved', () => {
    render(
      <ApprovalCard
        approval={{ ...defaultApproval, status: BOOKING_STATUS.approved }}
      />
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});
