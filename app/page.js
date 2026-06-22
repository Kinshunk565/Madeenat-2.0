'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BuyerPortal() {
  const router = useRouter();
  const [groupedCatalog, setGroupedCatalog] = useState({});
  const [brandsList, setBrandsList] = useState([]);
  const [topSearched, setTopSearched] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelListings, setModelListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Toggle View All Models state (default false, curation mode)
  const [showAllModels, setShowAllModels] = useState(false);
  // Expanded state for accordion brands
  const [expandedBrands, setExpandedBrands] = useState({});

  useEffect(() => {
    fetchCatalog();
    checkSession();
  }, []);

  // Close mobile menu on route
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/catalog');
      const data = await res.json();
      if (data.groupedByBrand) {
        setGroupedCatalog(data.groupedByBrand);
        setTopSearched(data.topSearchedModels || []);

        // Predefined B2B brand ordering (alphabetical order, 'Other' last)
        const brandOrder = ['Acer', 'Apple', 'Asus', 'Dell', 'HP', 'Lenovo', 'Panasonic', 'Samsung', 'Toshiba', 'Other'];
        
        // Filter brands that actually have models in our catalog
        const activeBrands = brandOrder.filter((brand) => !!data.groupedByBrand[brand]);
        setBrandsList(activeBrands);

        // Initialize all active brands as expanded by default
        const initialExpanded = {};
        activeBrands.forEach((b) => {
          initialExpanded[b] = true;
        });
        setExpandedBrands(initialExpanded);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      // Ignored: buyer is anonymous
    }
  };

  const toggleBrand = (brand) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brand]: !prev[brand],
    }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() !== '') {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectModel = async (model) => {
    setSelectedModel(model);
    setListingsLoading(true);
    try {
      const res = await fetch(`/api/catalog/listings?modelId=${model.id}`);
      const data = await res.json();
      if (data.listings) {
        setModelListings(data.listings);
        // Log view tracking event for selected model listing details
        const listingIds = data.listings.map(l => l.id);
        if (listingIds.length > 0) {
          fetch('/api/tracking/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingIds, eventType: 'VIEW' }),
          });
        }
      } else {
        setModelListings([]);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
      setModelListings([]);
    } finally {
      setListingsLoading(false);
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
      if (sanitizedPhone.startsWith('0')) {
        sanitizedPhone = '971' + sanitizedPhone.substring(1);
      } else {
        sanitizedPhone = '971' + sanitizedPhone;
      }
    }

    // 3. Construct WhatsApp API link according to specification
    const autoMessage = `Hi! what is the best price of ${selectedModel.name}? (Enquiry coming from www.madeenat.com)`;
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${sanitizedPhone}&text=${encodeURIComponent(autoMessage)}&type=phone_number&app_absent=0`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo-container">
            <a href="/">
              <img src="/logo.png" alt="Madeenat.com" className="logo-img" id="platform-logo" />
            </a>
            <span className="logo-badge">B2B</span>
          </div>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            id="mobile-menu-toggle"
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

          {/* Mobile overlay */}
          <div
            className={`mobile-nav-overlay ${mobileMenuOpen ? 'visible' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          />

          <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button
              id="header-add-product-btn"
              className="btn btn-secondary"
              onClick={() => { setMobileMenuOpen(false); router.push('/supplier?openSubmit=true'); }}
            >
              Add Your Product
            </button>
            <a href="/" className="nav-link active" onClick={() => setMobileMenuOpen(false)}>Buyer Catalog</a>
            {user ? (
              <a href="/supplier" className="btn btn-primary" id="nav-supplier-dash" onClick={() => setMobileMenuOpen(false)}>Supplier Portal</a>
            ) : (
              <a href="/auth" className="btn btn-primary" id="nav-login-btn" onClick={() => setMobileMenuOpen(false)}>Supplier Login</a>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <span className="hero-eyebrow">
            UAE's Trusted B2B Marketplace
          </span>
          <h2 className="hero-title" id="hero-heading">Source Laptop Stock in Bulk</h2>
          <p className="hero-subtitle">
            Instantly search real-time wholesale laptops. View configurations and negotiate directly with verified suppliers via automated WhatsApp enquiries.
          </p>

          {/* Google-like Search Bar (Redirects to Search Results Page) */}
          <div className="search-container" style={{ marginBottom: '2.5rem' }}>
            <form onSubmit={handleSearchSubmit} id="homepage-search-form">
              <div className="search-input-wrapper">
                <span className="search-icon">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  id="catalog-search-bar"
                  type="text"
                  className="search-input"
                  placeholder="Search by laptop brand, model or spec..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    id="clear-search-btn"
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="hero-cta-group">
            <button
              id="hero-add-product-btn"
              className="btn btn-primary"
              onClick={() => router.push('/supplier?openSubmit=true')}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Your Product
            </button>
            <button
              id="view-all-models-link"
              className="btn btn-secondary"
              onClick={() => setShowAllModels(true)}
            >
              View All Models
            </button>
          </div>
        </section>

        {/* Listings Drawer */}
        {selectedModel && (
          <section className="listings-panel" id="listings-panel">
            <div className="panel-header">
              <div>
                <span className="card-brand">{selectedModel.brand}</span>
                <h3 className="panel-title">{selectedModel.name}</h3>
              </div>
              <button
                id="close-panel-btn"
                className="close-panel-btn"
                onClick={() => setSelectedModel(null)}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {listingsLoading ? (
              <p className="text-center" style={{ padding: '2rem' }}>Loading supplier listings...</p>
            ) : modelListings.length === 0 ? (
              <div className="empty-state" id="no-listings-message">
                <p>No suppliers currently have this model in stock. Check back later or search another model.</p>
              </div>
            ) : (
              <div className="listings-table-container">
                <table className="listings-table">
                  <thead>
                    <tr>
                      <th>Supplier Details</th>
                      <th>Specifications</th>
                      <th>Quantity Available</th>
                      <th>Direct Enquiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelListings.map((listing) => (
                      <tr key={listing.id} className="listing-row" id={`listing-${listing.id}`}>
                        <td data-label="Supplier">
                          <div className="supplier-info">
                            <span className="supplier-company">{listing.companyName}</span>
                            <span className="supplier-phone">{listing.phoneNumber}</span>
                            {listing.category === 'USED_LIST' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.15rem' }}>
                                Bulk List Submission
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Specs">
                          <div className="listing-specs">
                            <span className="spec-pill" title="CPU">{listing.cpu}</span>
                            {listing.ram && <span className="spec-pill" title="RAM">{listing.ram}</span>}
                            {listing.ssd && <span className="spec-pill" title="Storage">{listing.ssd}</span>}
                            <span className="spec-pill" title="GPU">{listing.gpu}</span>
                          </div>
                        </td>
                        <td data-label="Quantity">
                          <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                            {listing.quantity} units
                          </span>
                        </td>
                        <td data-label="Enquiry">
                          <button
                            id={`whatsapp-btn-${listing.id}`}
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
            )}
          </section>
        )}

        {/* Recently Top-Searched Models Curation Grid */}
        <section style={{ marginTop: '3rem' }}>
          <h3 className="section-heading">
            Recently Top-Searched Laptop Models
          </h3>
          <div className="catalog-grid" style={{ marginBottom: '2.5rem' }}>
            {topSearched.map((model) => {
              const activeListings = model.listings || [];
              const inStockCount = activeListings.reduce((sum, item) => sum + item.quantity, 0);
              const hasStock = inStockCount > 0;

              return (
                <div
                  key={model.id}
                  className="laptop-card"
                  id={`top-card-${model.id}`}
                  onClick={() => handleSelectModel(model)}
                >
                  <span className="card-brand">{model.brand}</span>
                  <h3 className="card-name">{model.name}</h3>
                  <p className="card-specs-summary">Featured inventory config from regional suppliers.</p>

                  <div className="card-footer">
                    <span className={`availability-tag ${!hasStock ? 'out-of-stock' : ''}`}>
                      {hasStock ? `${activeListings.length} suppliers in stock` : 'Out of Stock'}
                    </span>
                    <span className="card-action-text">
                      View Details
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Collapsible Brand Accordions (Revealed via 'View All Models' toggle) */}
        {showAllModels && (
          <section style={{ marginTop: '2rem' }} id="all-models-accordion-section">
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontWeight: '700' }}>
              All Laptop Models Organized By Brand
            </h2>

            {loading ? (
              <p className="text-center" style={{ padding: '4rem 0' }}>Loading laptop models...</p>
            ) : brandsList.length === 0 ? (
              <div className="empty-state">
                <p>No brands found in the catalog.</p>
              </div>
            ) : (
              <div>
                {brandsList.map((brand) => {
                  const brandModels = groupedCatalog[brand] || [];
                  const isExpanded = !!expandedBrands[brand];

                  return (
                    <div key={brand} className="brand-accordion" id={`brand-accordion-${brand}`}>
                      <div
                        className="brand-header"
                        id={`brand-header-${brand}`}
                        onClick={() => toggleBrand(brand)}
                      >
                        <h3 className="brand-title">
                          {brand}
                          <span className="brand-count">{brandModels.length} models</span>
                        </h3>
                        <span className={`brand-chevron ${isExpanded ? 'expanded' : ''}`}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="brand-content" id={`brand-content-${brand}`}>
                          {brandModels.map((model) => {
                            const activeListings = model.listings || [];
                            const inStockCount = activeListings.reduce((sum, item) => sum + item.quantity, 0);
                            const hasStock = inStockCount > 0;

                            return (
                              <div
                                key={model.id}
                                className="laptop-card"
                                id={`laptop-card-${model.id}`}
                                onClick={() => handleSelectModel(model)}
                              >
                                <span className="card-brand">{model.brand}</span>
                                <h3 className="card-name">{model.name}</h3>
                                <p className="card-specs-summary">Select model to view configurations.</p>

                                <div className="card-footer">
                                  <span className={`availability-tag ${!hasStock ? 'out-of-stock' : ''}`}>
                                    {hasStock ? `${activeListings.length} suppliers in stock` : 'Out of Stock'}
                                  </span>
                                  <span className="card-action-text">
                                    View Details
                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">Madeenat.com</span>
          <span>UAE's Trusted B2B Laptop Wholesale Marketplace</span>
          <span>© {new Date().getFullYear()} Madeenat. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
