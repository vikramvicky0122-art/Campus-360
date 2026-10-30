import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api.js";
import {
  listTransactions,
  listPayouts,
  confirmTransaction,
  recordRefund,
  markPayoutPaid,
  formatPaise,
  paymentStatusInfo,
} from "../services/paymentService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modals / Action states
  const [refundModal, setRefundModal] = useState({ open: false, txId: null, maxPaise: 0 });
  const [refundAmountRupees, setRefundAmountRupees] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [payoutModal, setPayoutModal] = useState({ open: false, payoutId: null });
  const [payoutMethod, setPayoutMethod] = useState("UPI");
  const [payoutRef, setPayoutRef] = useState("");

  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "overview") {
        const statsRes = await api.get("/admin/stats");
        setStats(statsRes.data);
      } else if (activeTab === "transactions") {
        const txRes = await listTransactions({ page: 1, limit: 50 });
        setTransactions(txRes.data || []);
      } else if (activeTab === "payouts") {
        const poRes = await listPayouts({ page: 1, limit: 50 });
        setPayouts(poRes.data || []);
      } else if (activeTab === "users") {
        const usersRes = await api.get("/admin/users?limit=50");
        setUsers(usersRes.data || []);
      } else if (activeTab === "bookings") {
        const bkRes = await api.get("/admin/bookings?limit=50");
        setBookings(bkRes.data || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmTx = async (id) => {
    try {
      await confirmTransaction(id, "Manually confirmed by Admin");
      setActionSuccess(`Transaction ${id} confirmed successfully.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExecuteRefund = async () => {
    if (!refundAmountRupees || Number(refundAmountRupees) <= 0) {
      alert("Please enter a valid refund amount.");
      return;
    }
    const refundPaise = Math.round(Number(refundAmountRupees) * 100);
    try {
      await recordRefund(refundModal.txId, {
        refundAmountPaise: refundPaise,
        note: refundNote || "Admin initiated refund",
      });
      setRefundModal({ open: false, txId: null, maxPaise: 0 });
      setRefundAmountRupees("");
      setRefundNote("");
      setActionSuccess("Refund recorded and ledger adjusted.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExecutePayout = async () => {
    try {
      await markPayoutPaid(payoutModal.payoutId, {
        method: payoutMethod,
        reference: payoutRef,
        adminNote: "Paid via Admin Console",
      });
      setPayoutModal({ open: false, payoutId: null });
      setPayoutRef("");
      setActionSuccess("Payout recorded as PAID to owner.");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Campus 360 Admin Console</h1>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Platform operations, 5% commission ledger, owner payouts, and marketplace moderation
          </p>
        </div>
        <span
          style={{
            background: "#10B98120",
            color: "#10B981",
            padding: "6px 12px",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Administrator Access
        </span>
      </div>

      {actionSuccess && (
        <div style={{ background: "#d1fae5", color: "#065f46", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
          {actionSuccess}
          <button onClick={() => setActionSuccess(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border)", marginBottom: 24, paddingBottom: 8 }}>
        {[
          { key: "overview", label: "📊 Overview & Financials" },
          { key: "transactions", label: "💳 Commission & Ledger" },
          { key: "payouts", label: "💸 Owner Payouts" },
          { key: "users", label: "👥 Users" },
          { key: "bookings", label: "📦 Bookings" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px",
              background: activeTab === tab.key ? "var(--primary)" : "transparent",
              color: activeTab === tab.key ? "#fff" : "var(--muted)",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading records...</p>
      ) : (
        <>
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && stats && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "var(--surface)", padding: 20, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Platform Commission (5%)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)", marginTop: 6 }}>
                    {formatPaise(stats.totalCommissionPaise || 0)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Earned on rentals</div>
                </div>

                <div style={{ background: "var(--surface)", padding: 20, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Gross Rental Volume</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>
                    {formatPaise(stats.totalGrossRentalPaise || 0)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Total rental volume</div>
                </div>

                <div style={{ background: "var(--surface)", padding: 20, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Owner Net Share (95%)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#2563EB", marginTop: 6 }}>
                    {formatPaise(stats.totalOwnerNetPaise || 0)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Disbursable to owners</div>
                </div>

                <div style={{ background: "var(--surface)", padding: 20, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Pending Owner Payouts</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#F59E0B", marginTop: 6 }}>
                    {stats.pendingPayouts || 0}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Awaiting admin release</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                <div style={{ background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Verified Students</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{stats.totalUsers}</div>
                </div>
                <div style={{ background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Active Listings</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{stats.activeListings}</div>
                </div>
                <div style={{ background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Active Rentals</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{stats.activeBookings}</div>
                </div>
                <div style={{ background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Completed Rentals</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{stats.completedBookings}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TRANSACTIONS & 5% COMMISSION LEDGER */}
          {activeTab === "transactions" && (
            <div style={{ background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                Rental Transactions & 5% Platform Commission Ledger
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F3F4F6", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px" }}>Transaction ID</th>
                      <th style={{ padding: "10px 14px" }}>Gross Rental</th>
                      <th style={{ padding: "10px 14px" }}>5% Commission</th>
                      <th style={{ padding: "10px 14px" }}>Owner Net (95%)</th>
                      <th style={{ padding: "10px 14px" }}>Security Deposit</th>
                      <th style={{ padding: "10px 14px" }}>Status</th>
                      <th style={{ padding: "10px 14px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>No transaction records yet.</td></tr>
                    ) : (
                      transactions.map((tx) => {
                        const statusObj = paymentStatusInfo(tx.paymentStatus);
                        return (
                          <tr key={tx.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace" }}>{tx.id.slice(0, 8)}...</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{formatPaise(tx.grossRentalAmountPaise)}</td>
                            <td style={{ padding: "10px 14px", color: "var(--primary)", fontWeight: 600 }}>
                              {formatPaise(tx.commissionPaise)}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#2563EB", fontWeight: 600 }}>
                              {formatPaise(tx.ownerNetPaise)}
                            </td>
                            <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                              {formatPaise(tx.securityDepositPaise)}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ background: `${statusObj.color}20`, color: statusObj.color, padding: "3px 8px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                                {statusObj.label}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                {tx.paymentStatus !== "confirmed" && (
                                  <button
                                    onClick={() => handleConfirmTx(tx.id)}
                                    style={{ padding: "4px 8px", fontSize: 11, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                  >
                                    Confirm
                                  </button>
                                )}
                                <button
                                  onClick={() => setRefundModal({ open: true, txId: tx.id, maxPaise: tx.grossRentalAmountPaise - tx.refundedAmountPaise })}
                                  style={{ padding: "4px 8px", fontSize: 11, background: "#EF4444", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                >
                                  Refund
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: OWNER PAYOUTS */}
          {activeTab === "payouts" && (
            <div style={{ background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                Owner Payout Records (Disbursements)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F3F4F6", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px" }}>Payout ID</th>
                      <th style={{ padding: "10px 14px" }}>Owner</th>
                      <th style={{ padding: "10px 14px" }}>Amount</th>
                      <th style={{ padding: "10px 14px" }}>Status</th>
                      <th style={{ padding: "10px 14px" }}>Method / Ref</th>
                      <th style={{ padding: "10px 14px" }}>Paid At</th>
                      <th style={{ padding: "10px 14px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>No payout records found.</td></tr>
                    ) : (
                      payouts.map((po) => (
                        <tr key={po.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace" }}>{po.id.slice(0, 8)}...</td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontWeight: 600 }}>{po.owner?.fullName || "Owner"}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{po.owner?.collegeEmail}</div>
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#2563EB" }}>
                            {formatPaise(po.amountPaise)}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                background: po.status === "paid" ? "#10B98120" : "#F59E0B20",
                                color: po.status === "paid" ? "#10B981" : "#F59E0B",
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontWeight: 600,
                                fontSize: 11,
                              }}
                            >
                              {po.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 12 }}>
                            {po.method ? `${po.method} (${po.reference || "No ref"})` : "—"}
                          </td>
                          <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 12 }}>
                            {po.paidAt ? new Date(po.paidAt).toLocaleDateString() : "Pending"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {po.status === "pending" && (
                              <button
                                onClick={() => setPayoutModal({ open: true, payoutId: po.id })}
                                style={{ padding: "4px 8px", fontSize: 11, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: USERS */}
          {activeTab === "users" && (
            <div style={{ background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                Verified College Users
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F3F4F6", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px" }}>Name</th>
                    <th style={{ padding: "10px 14px" }}>College Email</th>
                    <th style={{ padding: "10px 14px" }}>Role</th>
                    <th style={{ padding: "10px 14px" }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{u.fullName}</td>
                      <td style={{ padding: "10px 14px" }}>{u.collegeEmail}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: u.role === "ADMIN" ? "#7c3aed20" : "#05966920", color: u.role === "ADMIN" ? "#7c3aed" : "#059669", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: BOOKINGS */}
          {activeTab === "bookings" && (
            <div style={{ background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                All Platform Bookings
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F3F4F6", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px" }}>Item</th>
                    <th style={{ padding: "10px 14px" }}>Borrower</th>
                    <th style={{ padding: "10px 14px" }}>Dates</th>
                    <th style={{ padding: "10px 14px" }}>Total</th>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{b.listing?.title || "Listing"}</td>
                      <td style={{ padding: "10px 14px" }}>{b.borrower?.fullName || b.borrower?.collegeEmail}</td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                        {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>₹{b.totalPriceSnapshot}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: "#E5E7EB", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* REFUND MODAL */}
      {refundModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 100 }}>
          <div style={{ background: "var(--surface)", padding: 24, borderRadius: 8, width: 380, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 12px" }}>Record Transaction Refund</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
              Max refundable: ₹{(refundModal.maxPaise / 100).toFixed(2)}
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Refund Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                value={refundAmountRupees}
                onChange={(e) => setRefundAmountRupees(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Note / Reason</label>
              <input
                type="text"
                placeholder="Optional explanation"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setRefundModal({ open: false, txId: null, maxPaise: 0 })} style={{ padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleExecuteRefund} style={{ padding: "8px 14px", background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Process Refund</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT MODAL */}
      {payoutModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 100 }}>
          <div style={{ background: "var(--surface)", padding: 24, borderRadius: 8, width: 380, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 12px" }}>Mark Owner Payout as Paid</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Payment Method</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6 }}
              >
                <option value="UPI">UPI Transfer</option>
                <option value="Bank_Transfer">NEFT / IMPS Bank Transfer</option>
                <option value="Cash">Cash Handover</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>UTR / Reference Number</label>
              <input
                type="text"
                placeholder="Bank reference or UTR"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setPayoutModal({ open: false, payoutId: null })} style={{ padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleExecutePayout} style={{ padding: "8px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>Confirm Paid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

