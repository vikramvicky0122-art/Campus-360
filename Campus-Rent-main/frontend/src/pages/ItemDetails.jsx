import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import ItemGallery from "../components/ItemGallery.jsx";
import ItemInfo from "../components/ItemInfo.jsx";
import BookingForm from "../components/BookingForm.jsx";
import PriceBreakdown from "../components/PriceBreakdown.jsx";
import { checkAvailability } from "../utils/bookingUtils.js";
import { useBookings } from "../context/BookingContext.jsx";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";

function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bookings } = useBookings();

  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchListing = async () => {
      try {
        setIsLoading(true);
        const response = await api.getListingById(id, abortController.signal);
        
        if (isMounted && response.success) {
          const apiItem = response.data;
          const mappedItem = {
            id: apiItem.id,
            title: apiItem.title,
            description: apiItem.description,
            category: apiItem.category,
            condition: apiItem.condition,
            pricePerDay: apiItem.dailyRentalRate,
            securityDeposit: apiItem.securityDeposit,
            mrp: apiItem.retailPrice,
            minimumRentalDays: apiItem.minimumRentalDays,
            location: apiItem.preferredPickupZone,
            images: apiItem.images && apiItem.images.length > 0 
              ? apiItem.images.map(img => img.imageUrl) 
              : ["purple"], 
            rating: apiItem.owner?.lenderRating || 4.8,
            reviewsCount: apiItem.owner?.ratingsCount || 0,
            ownerName: apiItem.owner?.fullName,
            ownerDept: apiItem.owner?.department,
            ownerImg: apiItem.owner?.profileImage,
            isVerified: true, 
            availability: apiItem.status === 'active' ? 'Available Now' : 'Not Available',
            dateAdded: apiItem.createdAt,
            isHidden: apiItem.status !== 'active'
          };
          setItem(mappedItem);
          setFetchError(null);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (isMounted) {
          console.error("Failed to fetch live listing:", err);
          setFetchError(err.message || "Failed to load listing");
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchListing();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [id]);

  if (isLoading) {
    return (
      <section className="page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '18px' }}>Loading listing details...</p>
      </section>
    );
  }

  if (!item) {
    return (
      <section className="page" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Item not found</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>{fetchError || "The gear you are looking for doesn't exist or was removed."}</p>
        <button onClick={() => navigate('/marketplace')} className="btn primary">
          Back to Marketplace
        </button>
      </section>
    );
  }

  const calculateTotalDays = () => {
    if (!startDate || !endDate) return 0;
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays + 1 : 0;
  };

  const validateDates = (start, end) => {
    setError("");
    if (start && end) {
      const d1 = new Date(start);
      const d2 = new Date(end);
      d1.setHours(0, 0, 0, 0);
      d2.setHours(0, 0, 0, 0);
      if (d2 < d1) {
        setError("Return date cannot be before pickup date.");
        return false;
      }
      
      const activeBookings = bookings.filter(
        (b) => String(b.itemId) === String(item.id) && 
               (b.status === BOOKING_STATUS.approved || b.status === BOOKING_STATUS.itemGiven || b.status === BOOKING_STATUS.ongoing || b.status === BOOKING_STATUS.returnPending)
      );

      const availability = checkAvailability(start, end, activeBookings);
      if (!availability.isAvailable) {
        setError(`Item is already booked from ${availability.conflict.start} to ${availability.conflict.end}.`);
        return false;
      }
    }
    return true;
  };

  const handleStartChange = (val) => {
    setStartDate(val);
    validateDates(val, endDate);
  };

  const handleEndChange = (val) => {
    setEndDate(val);
    validateDates(startDate, val);
  };

  const totalDays = calculateTotalDays();
  const totalItemPrice = totalDays * item.pricePerDay;
  const serviceFee = totalDays > 0 ? 50 : 0;
  const finalTotal = totalItemPrice + serviceFee + (item.securityDeposit || 0);
  const isValid = totalDays > 0 && !error;

  const proceedToBooking = () => {
    navigate(`/booking/${item.id}`, { state: { startDate, endDate, from: 'details' } });
  };

  return (
    <section className="page" style={{ paddingTop: '24px' }}>
      
      {/* Back Navigation & Breadcrumbs */}
      <nav style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>â†</span> Back
        </button>
        <span>|</span>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>Home</Link>
        <span>&gt;</span>
        <Link to="/marketplace" style={{ textDecoration: 'none', color: 'inherit' }}>Marketplace</Link>
        <span>&gt;</span>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{item.title}</span>
      </nav>

      <div className="item-details-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '48px', alignItems: 'start' }}>
        
        {/* Left Section: Gallery & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <ItemGallery images={item.images} fallbackClass={item.imageClass || item.images?.[0]} />
          <ItemInfo item={item} />
        </div>

        {/* Right Section: Sticky Booking Panel */}
        <div style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <BookingForm 
            startDate={startDate} 
            endDate={endDate} 
            onStartChange={handleStartChange} 
            onEndChange={handleEndChange} 
            error={error} 
            totalDays={totalDays} 
          />
          <PriceBreakdown 
            totalDays={totalDays}
            pricePerDay={item.pricePerDay}
            securityDeposit={item.securityDeposit}
            serviceFee={serviceFee}
            finalTotal={finalTotal}
            isValid={isValid}
            onConfirm={proceedToBooking}
            primaryText="Request to Book"
          />
        </div>

      </div>
    </section>
  );
}

export default ItemDetails;

