import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import { useListings } from "../context/ListingContext.jsx";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

const steps = ["Item Info", "Pricing Info", "Visual Showcase"];

const conditionOptions = [
  { value: "new", title: "New", desc: "Never used, original packaging" },
  { value: "like-new", title: "Like New", desc: "Minimal wear, functional" },
  { value: "good", title: "Good", desc: "Minor scratches, well maintained" },
  { value: "fair", title: "Fair", desc: "Clear signs of use, works fine" },
];

const categoryOptions = ["Tech", "Adventure", "Sports", "Books", "General", "Other"];
const locationOptions = ["Central Garden", "Pie-Chai", "Bihan", "AMUL", "Other"];

const EMPTY_FORM = {
  title: "",
  category: "Tech",
  customCategory: "",
  description: "",
  condition: "like-new",
  pricePerDay: "",
  securityDeposit: "",
  mrp: "",
  location: "Central Garden",
  customLocation: "",
  minDays: 1,
  images: []
};

function AddListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);
  const { refreshListings } = useListings();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(isEditMode);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const progress = (step / steps.length) * 100;

  const updateField = (key, value) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!form.title.trim() || !form.description.trim()) {
        setError("Title and description are required.");
        return false;
      }
      if (form.category === "Other" && !form.customCategory.trim()) {
        setError("Please enter a custom category.");
        return false;
      }
    }
    if (currentStep === 2) {
      const p = Number(form.pricePerDay);
      const d = Number(form.securityDeposit);
      const m = Number(form.mrp);
      const minD = Number(form.minDays);

      if (!p || !d || !m || p <= 0 || d <= 0 || m <= 0) {
        setError("Pricing fields must be greater than zero.");
        return false;
      }
      if (d >= m) {
        setError("Security Deposit must be strictly less than the Retail Price (MRP).");
        return false;
      }
      if (!minD || minD < 1) {
        setError("Minimum rental days must be at least 1.");
        return false;
      }
      if (form.location === "Other" && !form.customLocation.trim()) {
        setError("Please enter a custom pickup location.");
        return false;
      }
    }
    if (currentStep === 3) {
      if (form.images.length === 0) {
        setError("Please upload at least one image.");
        return false;
      }
    }
    return true;
  };

  // 2. Navigation Functions (STRICT)
  const goNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const goBack = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleImageSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const availableSlots = 5 - form.images.length;
    const filesToUpload = selectedFiles.slice(0, availableSlots);
    if (filesToUpload.length === 0) return;

    setError("");
    setIsUploading(true);

    try {
      const uploadedUrls = [];
      for (const file of filesToUpload) {
        const uploadRes = await api.uploadListingImage(file);
        if (uploadRes?.success && uploadRes?.data?.url) {
          uploadedUrls.push(uploadRes.data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveImage = (index) => {
    setForm(prev => {
      const updated = [...prev.images];
      updated.splice(index, 1);
      return { ...prev, images: updated };
    });
  };

  // Load existing listing data for edit mode
  useEffect(() => {
    if (!editId) return;

    const loadListing = async () => {
      try {
        const res = await api.getListingById(editId);
        if (res.success && res.data) {
          const item = res.data;
          setForm({
            title: item.title || '',
            category: categoryOptions.includes(item.category) ? item.category : 'Other',
            customCategory: categoryOptions.includes(item.category) ? '' : (item.category || ''),
            description: item.description || '',
            condition: item.condition || 'good',
            pricePerDay: String(item.dailyRentalRate || ''),
            securityDeposit: String(item.securityDeposit || ''),
            mrp: String(item.retailPrice || ''),
            location: locationOptions.includes(item.preferredPickupZone) ? item.preferredPickupZone : 'Other',
            customLocation: locationOptions.includes(item.preferredPickupZone) ? '' : (item.preferredPickupZone || ''),
            minDays: item.minimumRentalDays || 1,
            images: (item.images || []).map((img) => img.imageUrl)
          });
        }
      } catch {
        setError('Failed to load listing for editing.');
      } finally {
        setIsLoadingEdit(false);
      }
    };

    loadListing();
  }, [editId]);

  const handlePublish = async () => {
    if (validateStep(3)) {
      const finalCategory = form.category === "Other" ? form.customCategory : form.category;
      const finalLocation = form.location === "Other" ? form.customLocation : form.location;

      const payload = {
        title: form.title,
        description: form.description,
        category: finalCategory,
        condition: form.condition,
        dailyRentalRate: Number(form.pricePerDay),
        securityDeposit: Number(form.securityDeposit),
        retailPrice: Number(form.mrp),
        minimumRentalDays: Number(form.minDays),
        preferredPickupZone: finalLocation,
        images: form.images.map((imageUrl, index) => ({
          imageUrl,
          displayOrder: index
        }))
      };

      try {
        if (isEditMode) {
          await api.updateListing(editId, payload);
        } else {
          const response = await api.createListing(payload);
          await refreshListings();
          navigate(`/item/${response.data.id}`);
          return;
        }

        await refreshListings();
        navigate(`/item/${editId}`);
      } catch (err) {
        setError(err.message || "Failed to publish listing. Please try again.");
      }
    }
  };

  const handleCancelEdit = () => {
    navigate('/dashboard/listings');
  };

  if (isLoadingEdit) {
    return (
      <section className="listing-flow">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          Loading listing for editing...
        </div>
      </section>
    );
  }

  return (
    <section className="listing-flow">
      
      <div className="listing-header">
        <div>
          <h2>{isEditMode ? 'Edit Your Gear' : 'List Your Gear'}</h2>
          <p>{isEditMode ? 'Update your listing details below.' : 'Share your items with the campus community securely.'}</p>
        </div>
        {!isEditMode && <span className="listing-step">Step {step} of {steps.length}</span>}
      </div>

      {!isEditMode && (
        <div className="listing-progress">
          <div className="listing-progress-bar">
            <span className="listing-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="listing-progress-labels">
            {steps.map((label, index) => {
              const isCompletedOrActive = step >= index + 1;
              return (
                <span key={label} className={step === index + 1 ? "active" : isCompletedOrActive ? "complete" : ""}>
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      {/* STEP 1: Core Details */}
      {step === 1 && (
        <div className="listing-grid">
          <div className="listing-column">
            
            <div className="listing-card">
              <div className="listing-card-head">
                <span className="listing-card-icon">i</span>
                <div>
                  <h3>Core Details</h3>
                  <p>Tell renters the basics so they can decide quickly.</p>
                </div>
              </div>
              
              <div className="listing-field">
                <label>Item Title</label>
                <input
                  className="listing-input-field"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g., MacBook Pro M2 Space Gray"
                />
              </div>

              <div className="listing-field">
                <label>Category</label>
                <select 
                  className="listing-input-field"
                  style={{ cursor: 'pointer', appearance: 'menulist' }}
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                >
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {form.category === "Other" && (
                <div className="listing-field" style={{ marginTop: '12px' }}>
                  <label>Custom Category</label>
                  <input
                    className="listing-input-field"
                    value={form.customCategory}
                    onChange={(e) => updateField("customCategory", e.target.value)}
                    placeholder="Enter custom category"
                  />
                </div>
              )}

              <div className="listing-field">
                <label>Detailed Description</label>
                <textarea
                  className="listing-textarea"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Tell potential borrowers about the specs, age, and why it is great."
                  rows={4}
                />
              </div>
            </div>

            <div className="listing-card">
              <div className="listing-card-head">
                <span className="listing-card-icon">c</span>
                <div>
                  <h3>Condition</h3>
                  <p>Select the condition that best matches your item.</p>
                </div>
              </div>
              <div className="listing-condition-grid">
                {conditionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`listing-condition ${form.condition === option.value ? "active" : ""}`}
                    onClick={() => updateField("condition", option.value)}
                  >
                    <strong>{option.title}</strong>
                    <span>{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="listing-actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn primary" onClick={goNext}>Continue to Pricing</button>
            </div>
          </div>
          
          {/* Right Side Panel for Step 1 */}
          <aside className="listing-side">
            <div className="listing-side-card">
              <h4>Tips for a Great Listing</h4>
              <div className="listing-tip-list" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="listing-tip" style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>1</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Use descriptive titles</strong>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>Include brand names, models, and standout features.</p>
                  </div>
                </div>
                <div className="listing-tip" style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>2</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Add detailed descriptions</strong>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>Explaining use-cases (e.g., "Great for CS101 projects") increases bookings by 30%.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="listing-side-card" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '16px' }}>Live Preview</h4>
              <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                 <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--border)', borderRadius: '8px', marginBottom: '16px' }}></div>
                 <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{form.title || "Your Item Title"}</h3>
                 <span style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--bg)', padding: '4px 8px', borderRadius: '999px', display: 'inline-block' }}>
                   {form.category === "Other" && form.customCategory ? form.customCategory : (form.category || "Category")}
                 </span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* STEP 2: Pricing */}
      {step === 2 && (
        <div className="listing-grid" style={{ gridTemplateColumns: 'minmax(0, 800px)', justifyContent: 'center' }}>
          <div className="listing-column">
            <div className="listing-card">
              <div className="listing-card-head">
                <span className="listing-card-icon">P</span>
                <div>
                  <h3>Pricing & Protection</h3>
                  <p>Set securely verified parameters to protect your gear.</p>
                </div>
              </div>

              <div className="listing-form-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '24px' }}>
                <div>
                  <label>Daily Rate (₹)</label>
                  <input
                    type="number"
                    className="listing-input-field"
                    placeholder="e.g. 500"
                    value={form.pricePerDay}
                    onChange={(e) => updateField("pricePerDay", e.target.value)}
                  />
                </div>
                <div>
                  <label>Retail Price (MRP)</label>
                  <input
                    type="number"
                    className="listing-input-field"
                    placeholder="e.g. 15000"
                    value={form.mrp}
                    onChange={(e) => updateField("mrp", e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Security Deposit (₹)</span>
                  </label>
                  <input
                    type="number"
                    className="listing-input-field"
                    style={{ borderColor: Number(form.securityDeposit) >= Number(form.mrp) && form.mrp ? '#e11d48' : '' }}
                    placeholder="0"
                    value={form.securityDeposit}
                    onChange={(e) => updateField("securityDeposit", e.target.value)}
                  />
                  <small style={{ color: 'var(--muted)', display: 'block', marginTop: '6px' }}>Recommended: ~50% of the actual MRP</small>
                </div>
                <div>
                  <label>Minimum Rental Days</label>
                  <input
                    type="number"
                    min="1"
                    className="listing-input-field"
                    placeholder="1"
                    value={form.minDays}
                    onChange={(e) => updateField("minDays", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="listing-card">
              <div className="listing-field">
                <label>Preferred Pickup Spot</label>
                <select 
                  className="listing-input-field"
                  style={{ cursor: 'pointer', appearance: 'menulist' }}
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                >
                  {locationOptions.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <small style={{ color: 'var(--muted)', marginTop: '6px', display: 'block' }}>Choose a well-lit, busy area for a safe exchange.</small>
              </div>

              {form.location === "Other" && (
                <div className="listing-field" style={{ marginTop: '16px' }}>
                  <label>Custom Pickup Location</label>
                  <input
                    className="listing-input-field"
                    value={form.customLocation}
                    onChange={(e) => updateField("customLocation", e.target.value)}
                    placeholder="Enter a safe campus landmark"
                  />
                </div>
              )}
            </div>

            <div className="listing-actions">
              <button type="button" className="btn ghost" onClick={goBack}>Back to Item Info</button>
              <button type="button" className="btn primary" onClick={goNext}>Continue to Photos</button>
            </div>
            
          </div>
        </div>
      )}

      {/* STEP 3: Images */}
      {step === 3 && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="listing-card">
            <div className="listing-card-head">
              <span className="listing-card-icon">V</span>
              <div>
                <h3>Visual Showcase</h3>
                <p>High-quality photos build trust and improve conversions.</p>
              </div>
            </div>
            
            <div className="listing-upload">
              <div className="listing-upload-icon">+</div>
              <div>
                <strong>Upload images (max 5)</strong>
                <p style={{ color: 'var(--muted)' }}>Select real photos to upload securely.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleImageSelect}
              />
              <button 
                type="button" 
                className="btn primary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={form.images.length >= 5 || isUploading}
              >
                {form.images.length >= 5 ? "Limit Reached" : isUploading ? "Uploading..." : "Upload Images"}
              </button>
            </div>

            <div className="listing-upload-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px', marginTop: '24px' }}>
              {form.images.map((imgSrc, index) => {
                const media = resolveMediaDisplay(imgSrc, "purple");
                return (
                  <div key={index} style={{ position: 'relative' }}>
                    <div className={media.className} style={{ ...media.style, width: '100%', aspectRatio: '1/1', borderRadius: '12px', border: '2px solid var(--border)' }}></div>
                    <button 
                      onClick={() => handleRemoveImage(index)}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      x
                    </button>
                  </div>
                );
              })}
              {form.images.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '16px', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', background: 'var(--bg)', borderRadius: '8px' }}>
                  No photos uploaded yet. Click above to add some!
                </div>
              )}
            </div>

          </div>

          <div className="listing-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="btn ghost" onClick={isEditMode ? handleCancelEdit : goBack}>
              {isEditMode ? 'Cancel' : 'Back to Pricing'}
            </button>
            <button type="button" className="btn primary" onClick={handlePublish} disabled={form.images.length === 0}>
              {isEditMode ? 'Save Changes' : 'Publish to Marketplace'}
            </button>
          </div>
          
        </div>
      )}

    </section>
  );
}

export default AddListing;


