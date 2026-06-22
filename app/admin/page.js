'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | APPROVED | REJECTED | PROFILES
  const [supplierProfiles, setSupplierProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Rejection modal state
  const [rejectingListingId, setRejectingListingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.user.role !== 'ADMIN') {
        router.push('/admin/login');
        return;
      }
      setUser(data.user);
      
      // Load all listings
      await fetchAllListings();
    } catch (err) {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllListings = async () => {
    try {
      const res = await fetch('/api/admin/listings');
      const data = await res.json();
      if (data.listings) {
        setListings(data.listings);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  };

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await fetch('/api/admin/profiles');
      const data = await res.json();
      if (data.suppliers) {
        setSupplierProfiles(data.suppliers);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PROFILES') {
      fetchProfiles();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleApprove = async (id) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to approve listing.');
        return;
      }

      setActionSuccess('Listing approved successfully! It is now visible to buyers.');
      await fetchAllListings();
      setTimeout(() => setActionSuccess(''), 2000);
    } catch (err) {
      setActionError('An error occurred. Please try again.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!rejectionReason.trim()) {
      setActionError('Please enter a rejection reason.');
      return;
    }

    setSubmittingDecision(true);

    try {
      const res = await fetch(`/api/admin/listings/${rejectingListingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to reject listing.');
        setSubmittingDecision(false);
        return;
      }

      setActionSuccess('Listing rejected successfully.');
      await fetchAllListings();
      
      setTimeout(() => {
        setRejectingListingId(null);
        setRejectionReason('');
        setActionSuccess('');
        setSubmittingDecision(false);
      }, 1500);
    } catch (err) {
      setActionError('An error occurred. Please try again.');
      setSubmittingDecision(false);
    }
  };

  // Filter listings based on selected tab
  const filteredListings = listings.filter((l) => l.status === activeTab);

  // Compute counts
  const pendingCount = listings.filter((l) => l.status === 'PENDING').length;
  const approvedCount = listings.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = listings.filter((l) => l.status === 'REJECTED').length;

  if (loading) {
    return <p className="text-center" style={{ padding: '6rem' }}>Authenticating admin session...</p>;
  }

  const tabs = [
    { key: 'PENDING', label: 'Pending', count: pendingCount },
    { key: 'APPROVED', label: 'Approved', count: approvedCount },
    { key: 'REJECTED', label: 'Rejected', count: rejectedCount },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo-container">
            <a href="/">
              <img src="/logo.png" alt="Madeenat.com" className="logo-img" />
            </a>
            <span className="logo-badge">Admin</span>
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <div
            className={`mobile-nav-overlay ${mobileMenuOpen ? 'visible' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          />

          <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>View Buyer Portal</a>
            <button id="admin-logout-btn" onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="btn btn-secondary">Logout</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="admin-header">
          <div className="admin-title-section">
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              Inventory Review Portal
            </h2>
            <p className="admin-subtitle">
              Review supplier stock submissions. Approved items will instantly go live for buyer search.
            </p>
          </div>
        </div>

        {/* Action feedback notifications */}
        {actionSuccess && <div className="alert alert-success" id="admin-action-success">{actionSuccess}</div>}
        {actionError && <div className="alert alert-danger" id="admin-action-error">{actionError}</div>}

        {/* Statistics Section */}
        <section className="admin-stat-cards">
          <div className="admin-stat-card">
            <div className="stat-label">Pending Reviews</div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{pendingCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Approved Inventory</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{approvedCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Rejected Listings</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{rejectedCount}</div>
          </div>
        </section>

        {/* Queue filter tabs */}
        <div className="admin-tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`tab-admin-${tab.key.toLowerCase()}`}
              className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} Queue ({tab.count})
            </button>
          ))}
          <button
            id="tab-admin-profiles"
            className={`admin-tab ${activeTab === 'PROFILES' ? 'active' : ''}`}
            onClick={() => setActiveTab('PROFILES')}
          >
            Supplier Profiles
          </button>
        </div>

        {/* Listing Queue Grid or Profiles List */}
        <section>
          {activeTab === 'PROFILES' ? (
            loadingProfiles ? (
              <p className="text-center" style={{ padding: '4rem' }}>Loading supplier profiles...</p>
            ) : supplierProfiles.length === 0 ? (
              <div className="empty-state">
                <p>No registered supplier profiles found.</p>
              </div>
            ) : (
              <div className="listings-table-container">
                <table className="listings-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Email Address</th>
                      <th>Phone Number</th>
                      <th>Address</th>
                      <th>City, Country</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierProfiles.map((sup) => (
                      <tr key={sup.id} id={`supplier-profile-row-${sup.id}`}>
                        <td data-label="Company" style={{ fontWeight: '600' }}>{sup.companyName || 'N/A'}</td>
                        <td data-label="Email">{sup.email}</td>
                        <td data-label="Phone" style={{ fontWeight: '600' }}>{sup.phoneNumber || 'N/A'}</td>
                        <td data-label="Address">{sup.address || 'N/A'}</td>
                        <td data-label="Location">{sup.city ? `${sup.city}, ${sup.country || ''}` : sup.country || 'N/A'}</td>
                        <td data-label="Joined">{new Date(sup.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredListings.length === 0 ? (
            <div className="empty-state">
              <p>No listings found in the {activeTab.toLowerCase()} queue.</p>
            </div>
          ) : (
            <div className="queue-list">
              {filteredListings.map((listing) => (
                <div key={listing.id} className="queue-card" id={`queue-card-${listing.id}`}>
                  <div className="queue-details">
                    <span className="card-brand">{listing.laptopModel.brand}</span>
                    <h3 className="queue-model-name">{listing.laptopModel.name}</h3>
                    
                    <div className="listing-specs" style={{ margin: '0.5rem 0' }}>
                      <span className="spec-pill">{listing.cpu}</span>
                      <span className="spec-pill">{listing.ram}</span>
                      <span className="spec-pill">{listing.ssd}</span>
                      <span className="spec-pill">{listing.gpu}</span>
                    </div>

                    <div className="queue-supplier-info">
                      <span>Supplier: <strong>{listing.companyName}</strong></span>
                      <span>Phone: <strong>{listing.phoneNumber}</strong></span>
                      {listing.supplier && <span>Email: <strong>{listing.supplier.email}</strong></span>}
                      <span>Quantity: <strong>{listing.quantity} units</strong></span>
                      <span>Category: <strong>{listing.category === 'USED_LIST' ? 'Used Laptop List' : 'Single Laptop'}</strong></span>
                      {listing.supplier && listing.supplier.address && (
                        <span>Location: <strong>{listing.supplier.address}, {listing.supplier.city}, {listing.supplier.country}</strong></span>
                      )}
                    </div>

                    {listing.status === 'REJECTED' && listing.rejectionReason && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', borderLeft: '3px solid var(--danger)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '600' }}>Rejection Reason:</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{listing.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="queue-actions">
                    {listing.status === 'PENDING' && (
                      <>
                        <button
                          id={`approve-btn-${listing.id}`}
                          className="btn btn-primary"
                          onClick={() => handleApprove(listing.id)}
                        >
                          Approve
                        </button>
                        <button
                          id={`reject-btn-${listing.id}`}
                          className="btn btn-danger"
                          onClick={() => setRejectingListingId(listing.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rejection Reason Modal */}
        {rejectingListingId && (
          <div className="modal-overlay" id="reject-modal-overlay">
            <div className="modal-content" id="reject-modal-content" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Reject Stock Submission</h3>
                <button
                  id="close-reject-modal-btn"
                  className="close-panel-btn"
                  onClick={() => setRejectingListingId(null)}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} id="reject-form">
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor="rejectionReason">Reason for Rejection</label>
                    <textarea
                      id="rejectionReason"
                      className="form-control"
                      rows="4"
                      placeholder="e.g. Invalid CPU spec matching the model, or out of range pricing."
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    id="cancel-reject-btn"
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRejectingListingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-rejection-btn"
                    type="submit"
                    className="btn btn-danger"
                    disabled={submittingDecision}
                  >
                    {submittingDecision ? 'Submitting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">Madeenat.com</span>
          <span>© {new Date().getFullYear()} Madeenat. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
