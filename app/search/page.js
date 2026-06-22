'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (query) {
      logSearchQuery();
      fetchResults();
    } else {
      setListings([]);
      setLoading(false);
    }
  }, [query]);

  // Log visible listings as VIEWS when page changes
  useEffect(() => {
    if (listings.length > 0) {
      logVisibleImpressions();
    }
  }, [currentPage, listings]);

  const logSearchQuery = async () => {
    try {
      await fetch('/api/tracking/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
    } catch (err) {
      console.error('Failed to log search query:', err);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.laptopModels) {
        // Flatten approved listings associated with matched laptop models
        const flatListings = data.laptopModels.flatMap((model) => 
          (model.listings || []).map((listing) => ({
            ...listing,
            modelName: model.name,
            brandName: model.brand,
          }))
        );
        setListings(flatListings);
      }
    } catch (err) {
      console.error('Failed to fetch search results:', err);
    } finally {
      setLoading(false);
    }
  };

  const logVisibleImpressions = async () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const visibleListings = listings.slice(startIndex, startIndex + itemsPerPage);
    const visibleIds = visibleListings.map((l) => l.id);

    if (visibleIds.length === 0) return;

    try {
      await fetch('/api/tracking/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingIds: visibleIds,
          eventType: 'VIEW',
        }),
      });
    } catch (err) {
      console.error('Failed to log listing impressions:', err);
    }
  };

  const handleWhatsAppClick = async (listing) => {
    // 1. Log click tracking event
    try {
      await fetch('/api/tracking/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          eventType: 'CLICK',
        }),
      });
    } catch (err) {
      console.error('Failed to log click event:', err);
    }

    // 2. Sanitize supplier phone to start with 971 only (no spaces, dashes, or plus signs)
    let sanitizedPhone = listing.phoneNumber.replace(/[+\s-()]/g, '');
    if (!sanitizedPhone.startsWith('971')) {
      // Force UAE format if not already starting with country code
      if (sanitizedPhone.startsWith('0')) {
        sanitizedPhone = '971' + sanitizedPhone.substring(1);
      } else {
        sanitizedPhone = '971' + sanitizedPhone;
      }
    }

    // 3. Construct WhatsApp API link according to specification
    const autoMessage = `Hi! what is the best price of ${listing.modelName}? (Enquiry coming from www.madeenat.com)`;
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${sanitizedPhone}&text=${encodeURIComponent(autoMessage)}&type=phone_number&app_absent=0`;

    // 4. Redirect
    window.open(whatsappUrl, '_blank');
  };

  // Pagination calculations
  const totalPages = Math.ceil(listings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedListings = listings.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo-container">
            <a href="/">
              <img src="/logo.png" alt="Madeenat.com" className="logo-img" id="platform-title" />
            </a>
            <span className="logo-badge">B2B</span>
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
            <a href="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Buyer Catalog</a>
            <a href="/supplier" className="btn btn-secondary" onClick={() => setMobileMenuOpen(false)}>Supplier Portal</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Search Results
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Showing results for query: "{query}"
          </p>
        </div>

        {loading ? (
          <p className="text-center" style={{ padding: '6rem' }}>Searching inventory databases...</p>
        ) : listings.length === 0 ? (
          <div className="empty-state" id="no-search-results">
            <p>No verified stock listings match your search query. Try searching for a different brand or configuration.</p>
            <a href="/" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Back to Home Page</a>
          </div>
        ) : (
          <div>
            <div className="listings-table-container">
              <table className="listings-table">
                <thead>
                  <tr>
                    <th>Brand and Model</th>
                    <th>Specifications</th>
                    <th>Supplier Details</th>
                    <th>Quantity</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedListings.map((listing) => (
                    <tr key={listing.id} className="listing-row" id={`search-listing-${listing.id}`}>
                      <td data-label="Model" style={{ fontWeight: '600' }}>
                        <span className="card-brand" style={{ display: 'block', marginBottom: '0.15rem' }}>
                          {listing.brandName}
                        </span>
                        {listing.modelName}
                      </td>
                      <td data-label="Specs">
                        <div className="listing-specs">
                          <span className="spec-pill" title="CPU">{listing.cpu}</span>
                          {listing.ram && <span className="spec-pill" title="RAM">{listing.ram}</span>}
                          {listing.ssd && <span className="spec-pill" title="Storage">{listing.ssd}</span>}
                          <span className="spec-pill" title="GPU">{listing.gpu}</span>
                        </div>
                      </td>
                      <td data-label="Supplier">
                        <div className="supplier-info">
                          <span className="supplier-company">{listing.companyName}</span>
                          <span className="supplier-phone">{listing.phoneNumber}</span>
                        </div>
                      </td>
                      <td data-label="Quantity">
                        <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                          {listing.quantity} units
                        </span>
                      </td>
                      <td data-label="Action">
                        <button
                          id={`whatsapp-api-btn-${listing.id}`}
                          className="whatsapp-btn"
                          onClick={() => handleWhatsAppClick(listing)}
                        >
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.246 1.875 13.76 1.838 11.13 1.838c-5.44 0-9.864 4.42-9.868 9.866-.001 1.714.46 3.389 1.336 4.887l-.99 3.615 3.7-.977zm12.355-6.326c-.27-.135-1.595-.786-1.842-.876-.246-.09-.427-.135-.607.135-.18.27-.697.876-.855 1.057-.157.18-.315.202-.585.067-.27-.135-1.14-.42-2.172-1.34-1.03-.92-1.636-1.565-1.838-1.902-.2-.338-.022-.52.148-.688.153-.153.338-.394.507-.59.17-.197.225-.338.338-.564.112-.225.056-.422-.028-.59-.084-.168-.607-1.464-.83-2c-.217-.524-.436-.453-.607-.462-.157-.008-.337-.01-.517-.01s-.472.067-.72.338c-.247.27-.944.923-.944 2.25s.966 2.61 1.1 2.78c.135.17 1.9 2.9 4.606 4.074.645.28 1.148.447 1.54.572.648.206 1.237.177 1.702.108.518-.078 1.595-.652 1.82-1.283.225-.63.225-1.17.157-1.283-.067-.11-.247-.2-.517-.335z" />
                          </svg>
                          WhatsApp Enquiry
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }} id="pagination-controls">
                <button
                  id="prev-page-btn"
                  className="btn btn-secondary"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  id="next-page-btn"
                  className="btn btn-secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            )}
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

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<p className="text-center" style={{ padding: '6rem' }}>Loading Search Results...</p>}>
      <SearchResultsContent />
    </Suspense>
  );
}
