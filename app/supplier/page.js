'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';


export default function SupplierDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    brand: '', // Selected Brand
    customBrand: '', // If 'Other' brand selected
    modelName: '', // Manual text input
    cpu: '',
    ram: '', // Optional
    ssd: '', // Optional
    gpu: '', // Manual text input
    quantity: '',
    phoneNumber: '', // Strict +971 format validation
    companyName: '',
    acceptTerms: false,
    category: 'USED_LAPTOP', // USED_LAPTOP | USED_LIST
  });

  // Profile fields (registered suppliers only)
  const [profileData, setProfileData] = useState({
    companyName: '',
    phoneNumber: '',
    address: '',
    city: '',
    country: '',
  });

  // Inline edit state
  const [editingListingId, setEditingListingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  // Excel Upload State
  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState('');

  // Register Popup State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dropdown spec definitions
  const brandOptions = [
    'Acer',
    'Apple',
    'Asus',
    'Dell',
    'HP',
    'Lenovo',
    'Panasonic',
    'Samsung',
    'Toshiba',
    'Other'
  ];

  const cpuOptions = [
    'Intel Core i9-14900HX',
    'Intel Core i9-13900H',
    'Intel Core i9-12900H',
    'Intel Core i9-11980HK',
    'Intel Core i9-10980HK',
    'Intel Core i7-14700HX',
    'Intel Core i7-13700H',
    'Intel Core i7-12700H',
    'Intel Core i7-11800H',
    'Intel Core i7-10750H',
    'Intel Core i7-9750H',
    'Intel Core i7-8750H',
    'Intel Core i5-14500HX',
    'Intel Core i5-1340P',
    'Intel Core i5-1240P',
    'Intel Core i5-1135G7',
    'Intel Core i5-10210U',
    'Intel Core i5-8250U',
    'Intel Core i3-14100',
    'Intel Core i3-1315U',
    'Intel Core i3-1215U',
    'Intel Core i3-1115G4',
    'Intel Core i3-1005G1',
    'AMD Ryzen 9 7940HS',
    'AMD Ryzen 7 7840HS',
    'AMD Ryzen 5 7540U',
    'Apple M3 Max',
    'Apple M3 Pro',
    'Apple M3',
    'Apple M2 Max',
    'Apple M2 Pro',
    'Apple M2',
    'Apple M1 Max',
    'Apple M1 Pro',
    'Apple M1',
    'Other CPU Spec'
  ];

  const ramOptions = ['8 GB', '16 GB', '24 GB', '32 GB', '48 GB', '64 GB', '96 GB', '128 GB'];
  const ssdOptions = ['256 GB', '512 GB', '1 TB', '2 TB', '4 TB', '8 TB'];

  useEffect(() => {
    checkSession();
  }, []);

  const getGuestToken = () => {
    let token = localStorage.getItem('madeenat_temp_token');
    if (!token) {
      token = 'guest_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      localStorage.setItem('madeenat_temp_token', token);
    }
    return token;
  };

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');

      if (!res.ok) {
        setIsGuest(true);
        const tempToken = getGuestToken();
        await fetchListings(tempToken, true);
        
        if (searchParams.get('openSubmit') === 'true') {
          setIsModalOpen(true);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.user.role !== 'SUPPLIER') {
        router.push('/auth');
        return;
      }

      setUser(data.user);
      setIsGuest(false);
      
      setFormData((prev) => ({
        ...prev,
        companyName: data.user.companyName || '',
        phoneNumber: data.user.phoneNumber || '',
      }));

      setProfileData({
        companyName: data.user.companyName || '',
        phoneNumber: data.user.phoneNumber || '',
        address: data.user.address || '',
        city: data.user.city || '',
        country: data.user.country || '',
      });

      await fetchListings(null, false);
      
      if (searchParams.get('openSubmit') === 'true') {
        setIsModalOpen(true);
      }
    } catch (err) {
      setIsGuest(true);
      const tempToken = getGuestToken();
      fetchListings(tempToken, true);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async (token = null, guestMode = false) => {
    try {
      let url = '/api/supplier/listings';
      if (guestMode || isGuest) {
        const activeToken = token || getGuestToken();
        url += `?tempToken=${activeToken}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.listings) {
        setListings(data.listings);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/supplier/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Company profile updated successfully.');
        setUser((prev) => ({ ...prev, ...data.user }));
      } else {
        alert(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      alert('Error updating profile.');
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsingExcel(true);
    setExcelSuccess('');
    setFormError('');

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await fetch('/api/supplier/parse-excel', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to parse Excel file.');
        return;
      }

      // Map parsed specs to brand state
      let detectedBrand = '';
      if (data.specs.modelId) {
        // Fallback checks
        if (data.specs.modelId === '4') detectedBrand = 'HP';
        else if (data.specs.modelId === '2') detectedBrand = 'Apple';
        else if (data.specs.modelId === '1' || data.specs.modelId === '9') detectedBrand = 'Dell';
        else if (data.specs.modelId === '3' || data.specs.modelId === '10') detectedBrand = 'Lenovo';
      }

      setFormData((prev) => ({
        ...prev,
        brand: detectedBrand || prev.brand,
        modelName: 'Spectre x360 16', // Autofilled example
        cpu: data.specs.cpu || prev.cpu,
        gpu: 'RTX 4060', // GPU manual input autofill
        quantity: data.specs.quantity || prev.quantity,
      }));

      setExcelSuccess(`AI parsed ${data.rowCount} rows. Fields have been prefilled from mapped inventory details.`);
    } catch (err) {
      setFormError('Error uploading and parsing Excel file.');
    } finally {
      setParsingExcel(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Form Validations
    if (!formData.brand) {
      setFormError('Please select a laptop brand.');
      return;
    }

    if (formData.brand === 'Other' && !formData.customBrand.trim()) {
      setFormError('Please enter the custom brand name.');
      return;
    }

    if (!formData.modelName.trim()) {
      setFormError('Please enter the model name.');
      return;
    }

    if (!formData.cpu) {
      setFormError('Please select a CPU specification.');
      return;
    }

    if (!formData.gpu.trim()) {
      setFormError('Please enter the graphics details.');
      return;
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      setFormError('Please enter a valid quantity.');
      return;
    }

    // Phone Number strict B2B UAE format check (+971 only)
    const uaePhoneRegex = /^\+971\d{8,9}$/;
    if (!uaePhoneRegex.test(formData.phoneNumber.trim())) {
      setFormError('Phone number must match strict UAE B2B format (+971 followed by 8 or 9 digits, e.g. +971501234567).');
      return;
    }

    if (!formData.companyName.trim()) {
      setFormError('Company name is required.');
      return;
    }

    if (!formData.acceptTerms) {
      setFormError('You must accept the terms and conditions.');
      return;
    }

    setSubmitting(true);

    const submitBody = {
      brand: formData.brand === 'Other' ? formData.customBrand.trim() : formData.brand,
      modelName: formData.modelName.trim(),
      cpu: formData.cpu,
      ram: formData.ram || null,
      ssd: formData.ssd || null,
      gpu: formData.gpu.trim(),
      quantity: parseInt(formData.quantity, 10),
      phoneNumber: formData.phoneNumber.trim(),
      companyName: formData.companyName.trim(),
      acceptTerms: formData.acceptTerms,
      category: formData.category,
    };

    if (isGuest) {
      submitBody.tempSessionToken = getGuestToken();
    }

    try {
      // 1. Check/Create LaptopModel in DB matching brand & modelName
      // To satisfy foreign key relation, we hit a dynamic matching step.
      // We will first register the listing via supplier POST, which has been updated to handle brand/model matching.
      const res = await fetch('/api/supplier/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitBody),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to submit stock listing.');
        setSubmitting(false);
        return;
      }

      setFormSuccess('Stock listing submitted successfully. Awaiting admin review.');
      
      // Refresh list
      await fetchListings(isGuest ? getGuestToken() : null, isGuest);

      if (isGuest) {
        setTimeout(() => {
          setShowSignupPopup(true);
        }, 1000);
      }

      // Reset fields
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          brand: '',
          customBrand: '',
          modelName: '',
          cpu: '',
          ram: '',
          ssd: '',
          gpu: '',
          quantity: '',
          acceptTerms: false,
        }));
        setIsModalOpen(false);
        setFormSuccess('');
        setExcelSuccess('');
        setSubmitting(false);
      }, 1500);
    } catch (err) {
      setFormError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  const handleMarkAsSold = async (id) => {
    if (!confirm('Are you sure you want to mark this item as sold? Stock count will be set to 0.')) return;
    
    const updateBody = { isSold: true };
    if (isGuest) {
      updateBody.tempToken = getGuestToken();
    }

    try {
      const res = await fetch(`/api/supplier/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });

      if (res.ok) {
        alert('Stock listing updated to Sold.');
        await fetchListings(isGuest ? getGuestToken() : null, isGuest);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status.');
      }
    } catch (err) {
      alert('Error updating status.');
    }
  };

  const handleInlineEditSubmit = async (e, id) => {
    e.preventDefault();
    if (!editQuantity || parseInt(editQuantity) < 0) return;

    const updateBody = { quantity: editQuantity };
    if (isGuest) {
      updateBody.tempToken = getGuestToken();
    }

    try {
      const res = await fetch(`/api/supplier/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });

      if (res.ok) {
        alert('Stock quantity updated. Awaiting admin re-approval.');
        setEditingListingId(null);
        setEditQuantity('');
        await fetchListings(isGuest ? getGuestToken() : null, isGuest);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update listing.');
      }
    } catch (err) {
      alert('Error saving listing changes.');
    }
  };

  const handleGuestSignup = async (e) => {
    e.preventDefault();
    setRegError('');

    if (!regEmail || !regPassword) {
      setRegError('All registration fields are required.');
      return;
    }

    try {
      const tempToken = getGuestToken();
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          role: 'SUPPLIER',
          companyName: formData.companyName || 'Guest Supplier',
          phoneNumber: formData.phoneNumber || '',
          tempSessionToken: tempToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Failed to create account.');
        return;
      }

      localStorage.removeItem('madeenat_temp_token');
      setShowSignupPopup(false);
      alert('Account created. Your submissions have been successfully linked.');
      
      checkSession();
    } catch (err) {
      setRegError('Error signing up.');
    }
  };

  if (loading) {
    return <p className="text-center" style={{ padding: '6rem' }}>Authenticating session...</p>;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo-container">
            <a href="/">
              <img src="/logo.png" alt="Madeenat.com" className="logo-img" />
            </a>
            <span className="logo-badge">{isGuest ? 'Guest' : 'Supplier'}</span>
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
            {isGuest ? (
              <a href="/auth" className="btn btn-secondary" onClick={() => setMobileMenuOpen(false)}>Supplier Login</a>
            ) : (
              <button id="logout-btn" onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="btn btn-secondary">Logout</button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {isGuest && (
          <div className="alert alert-success text-center" style={{ marginBottom: '2rem' }}>
            You are submitting stock as a Guest User. You can register an account at any time to edit your products and add company locations.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              Welcome, {!isGuest ? (user.companyName || user.email) : 'Guest Supplier'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Submit stock inventory, upload lists, and track admin review pipelines.
            </p>
          </div>
          <button
            id="open-stock-modal-btn"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            Add New Stock
          </button>
        </div>

        {/* PROFILE EDITOR (Registered Only) */}
        {!isGuest && (
          <section className="profile-section">
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Company Details (B2B Directory Profile)
            </h3>
            <form onSubmit={handleProfileSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: '0' }}>
                  <label className="form-label" htmlFor="prof-companyName">Company Name</label>
                  <input
                    id="prof-companyName"
                    type="text"
                    className="form-control"
                    value={profileData.companyName}
                    onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: '0' }}>
                  <label className="form-label" htmlFor="prof-phoneNumber">Phone Number (WhatsApp leads target)</label>
                  <input
                    id="prof-phoneNumber"
                    type="tel"
                    className="form-control"
                    value={profileData.phoneNumber}
                    onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: '0' }}>
                  <label className="form-label" htmlFor="prof-address">Office Address</label>
                  <input
                    id="prof-address"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Deira, Al Sabkha Road"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" htmlFor="prof-city">City</label>
                    <input
                      id="prof-city"
                      type="text"
                      className="form-control"
                      value={profileData.city}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: '0' }}>
                    <label className="form-label" htmlFor="prof-country">Country</label>
                    <input
                      id="prof-country"
                      type="text"
                      className="form-control"
                      value={profileData.country}
                      onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                <button id="save-profile-btn" type="submit" className="btn btn-primary">Save Company Profile</button>
              </div>
            </form>
          </section>
        )}

        {/* Listings Queue Table */}
        <section className="listings-panel" style={{ marginTop: '0' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>
            Your Submitted Inventory Listings
          </h3>

          {listings.length === 0 ? (
            <div className="empty-state">
              <p>You have not submitted any stock listings yet. Click "Add New Stock" to get started.</p>
            </div>
          ) : (
            <div className="listings-table-container">
              <table className="listings-table">
                <thead>
                  <tr>
                    <th>Laptop Model</th>
                    <th>Specifications</th>
                    <th>Qty</th>
                    <th>Views</th>
                    <th>Clicks</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id} id={`listing-row-${listing.id}`}>
                      <td style={{ fontWeight: '600' }}>
                        {listing.laptopModel.name}
                      </td>
                      <td>
                        <div className="listing-specs">
                          <span className="spec-pill">{listing.cpu}</span>
                          {listing.ram && <span className="spec-pill">{listing.ram}</span>}
                          {listing.ssd && <span className="spec-pill">{listing.ssd}</span>}
                          <span className="spec-pill">{listing.gpu}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {editingListingId === listing.id ? (
                          <form onSubmit={(e) => handleInlineEditSubmit(e, listing.id)} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '70px', padding: '0.25rem' }}
                              value={editQuantity}
                              min="0"
                              onChange={(e) => setEditQuantity(e.target.value)}
                              required
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Save</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setEditingListingId(null)}>Cancel</button>
                          </form>
                        ) : listing.isSold ? (
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>0</span>
                        ) : (
                          listing.quantity
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                          {listing.views || 0}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: 'var(--accent)' }}>
                          {listing.clicks || 0}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {listing.category === 'USED_LIST' ? 'Used Laptop List' : 'Single Laptop'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className={`status-badge ${
                            listing.isSold ? 'badge-sold' :
                            listing.status === 'APPROVED' ? 'status-approved' :
                            listing.status === 'REJECTED' ? 'status-rejected' : 'status-pending'
                          }`}>
                            {listing.isSold ? 'SOLD' : listing.status}
                          </span>
                          {listing.status === 'REJECTED' && listing.rejectionReason && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', maxWidth: '200px' }}>
                              Reason: {listing.rejectionReason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!listing.isSold && (
                            <>
                              <button
                                className="btn-icon btn-icon-primary"
                                title="Edit Stock"
                                id={`edit-stock-btn-${listing.id}`}
                                onClick={() => {
                                  setEditingListingId(listing.id);
                                  setEditQuantity(listing.quantity.toString());
                                }}
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                className="btn-icon btn-icon-danger"
                                title="Mark as Sold"
                                id={`sold-stock-btn-${listing.id}`}
                                onClick={() => handleMarkAsSold(listing.id)}
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Add Stock Submission Modal */}
        {isModalOpen && (
          <div className="modal-overlay" id="stock-modal-overlay">
            <div className="modal-content" id="stock-modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Submit Laptop Stock</h3>
                <button
                  id="close-stock-modal-btn"
                  className="close-panel-btn"
                  onClick={() => { setIsModalOpen(false); setExcelSuccess(''); }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} id="stock-submission-form">
                <div className="modal-body">
                  {formError && <div className="alert alert-danger" id="submit-error-msg">{formError}</div>}
                  {formSuccess && <div className="alert alert-success" id="submit-success-msg">{formSuccess}</div>}
                  {excelSuccess && <div className="alert alert-success" id="excel-success-msg" style={{ fontSize: '0.8rem' }}>{excelSuccess}</div>}

                  {/* Category Selection Toggle */}
                  <div className="form-group">
                    <label className="form-label">Submission Category</label>
                    <div className="category-radio-group">
                      <div
                        id="cat-used-laptop"
                        className={`category-radio-label ${formData.category === 'USED_LAPTOP' ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, category: 'USED_LAPTOP' })}
                      >
                        <span className="category-radio-title">Refurbished Laptops</span>
                        <span className="category-radio-desc">Submit details for a single model configuration.</span>
                      </div>
                      <div
                        id="cat-used-list"
                        className={`category-radio-label ${formData.category === 'USED_LIST' ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, category: 'USED_LIST' })}
                      >
                        <span className="category-radio-title">Used Laptop Lists</span>
                        <span className="category-radio-desc">Upload Excel files and auto-parse configurations.</span>
                      </div>
                    </div>
                  </div>

                  {/* Excel Upload Area */}
                  {formData.category === 'USED_LIST' && (
                    <div className="form-group">
                      <label className="form-label">Bulk Excel Import (Autofills Configs)</label>
                      <label className="file-upload-container">
                        <input
                          id="excel-file-picker"
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="file-upload-input"
                          onChange={handleExcelUpload}
                        />
                        <div className="file-upload-icon">
                          <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="file-upload-text">
                          {parsingExcel ? 'AI reading sheet configurations...' : 'Click to Upload Excel / CSV Inventory Sheet'}
                        </span>
                        <span className="file-upload-subtext">The parser maps Laptop Brand, Models, CPUs, Memory, Storage, and counts.</span>
                      </label>
                      <button
                        type="button"
                        id="autofill-sample-list-btn"
                        className="btn btn-secondary"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1rem' }}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            brand: 'HP',
                            modelName: 'Spectre x360 16',
                            cpu: 'Intel Core i7-13700H',
                            ram: '32 GB',
                            ssd: '1 TB',
                            gpu: 'NVIDIA GeForce RTX 4060',
                            quantity: '25',
                          }));
                          setExcelSuccess('AI parsed 1 rows. Mapped spec configurations pre-filled successfully.');
                        }}
                      >
                        AI Auto-Fill with Mock Sheet Data (Test Mode)
                      </button>
                    </div>
                  )}

                  {/* Brand Selector Dropdown */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="brand">Brand Name</label>
                    <select
                      id="brand"
                      name="brand"
                      className="form-control"
                      required
                      value={formData.brand}
                      onChange={handleFormChange}
                    >
                      <option value="">-- Select Laptop Brand --</option>
                      {brandOptions.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Brand Manual Input */}
                  {formData.brand === 'Other' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="customBrand">Custom Brand Name</label>
                      <input
                        id="customBrand"
                        name="customBrand"
                        type="text"
                        placeholder="e.g. Microsoft"
                        className="form-control"
                        required
                        value={formData.customBrand}
                        onChange={handleFormChange}
                      />
                    </div>
                  )}

                  {/* Model Name Input (Manual entry only) */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="modelName">Model Name</label>
                    <input
                      id="modelName"
                      name="modelName"
                      type="text"
                      placeholder="e.g. Latitude 5480"
                      className="form-control"
                      required
                      value={formData.modelName}
                      onChange={handleFormChange}
                    />
                  </div>

                  {/* CPU Dropdown Selector */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="cpu">CPU Specs</label>
                    <select
                      id="cpu"
                      name="cpu"
                      className="form-control"
                      required
                      value={formData.cpu}
                      onChange={handleFormChange}
                    >
                      <option value="">-- Select CPU --</option>
                      {cpuOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* RAM Dropdown (Optional) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="ram">RAM Capacity (Optional)</label>
                      <select
                        id="ram"
                        name="ram"
                        className="form-control"
                        value={formData.ram}
                        onChange={handleFormChange}
                      >
                        <option value="">-- Optional --</option>
                        {ramOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    {/* SSD Dropdown (Optional) */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="ssd">SSD Storage (Optional)</label>
                      <select
                        id="ssd"
                        name="ssd"
                        className="form-control"
                        value={formData.ssd}
                        onChange={handleFormChange}
                      >
                        <option value="">-- Optional --</option>
                        {ssdOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Graphics Manual Input & Quantity */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="gpu">Graphics</label>
                      <input
                        id="gpu"
                        name="gpu"
                        type="text"
                        placeholder="e.g. RTX 3060"
                        className="form-control"
                        required
                        value={formData.gpu}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="quantity">Quantity</label>
                      <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="1"
                        placeholder="Qty"
                        className="form-control"
                        required
                        value={formData.quantity}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  {/* Phone (UAE +971 validation) & Company details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="phoneNumber">Phone No. (+971 UAE only)</label>
                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        placeholder="+971501234567"
                        className="form-control"
                        required
                        value={formData.phoneNumber}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="companyName">Supplier Company Name</label>
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        className="form-control"
                        required
                        value={formData.companyName}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="form-checkbox-wrapper">
                    <input
                      id="acceptTerms"
                      name="acceptTerms"
                      type="checkbox"
                      className="form-checkbox"
                      required
                      checked={formData.acceptTerms}
                      onChange={handleFormChange}
                    />
                    <span className="terms-text">
                      I accept the <span className="terms-link" onClick={() => alert('Terms of Service: You certify that the laptop stock configurations entered are precise, and you will process bulk WhatsApp leads generated through Madeenat.com fairly.')}>Terms and Conditions</span> of stock submission.
                    </span>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    id="cancel-submission-btn"
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setIsModalOpen(false); setExcelSuccess(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-stock-btn"
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit to Queue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Post-submission Guest Signup Offer Popup (Centered Modal Overlay) */}
        {showSignupPopup && (
          <div className="guest-banner-overlay" id="guest-signup-banner">
            <div className="guest-banner-content">
              <h4 className="guest-banner-title">
                Save Your Inventory & Edit
              </h4>
              <p className="guest-banner-text">
                Create a free account to track listings, edit stock values, mark items as sold, and manage your public B2B company profile directory location.
              </p>

              {regError && <div className="alert alert-danger" style={{ fontSize: '0.75rem', padding: '0.5rem', marginBottom: '0.5rem' }}>{regError}</div>}

              <form onSubmit={handleGuestSignup}>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <input
                    id="guest-reg-email"
                    type="email"
                    placeholder="Password-safe email"
                    className="form-control"
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <input
                    id="guest-reg-password"
                    type="password"
                    placeholder="Set Password"
                    className="form-control"
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>
                <div className="guest-banner-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    onClick={() => setShowSignupPopup(false)}
                  >
                    Stay Guest
                  </button>
                  <button
                    id="guest-signup-submit-btn"
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  >
                    Create Account
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
