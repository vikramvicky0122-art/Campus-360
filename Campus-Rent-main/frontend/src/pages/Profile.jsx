import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

function Profile() {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  
  const [copied, setCopied] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const isOwner = Boolean(!id) && Boolean(authUser);

  // Fetch user profile from API
  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        if (id) {
          const res = await api.get(`/users/${id}`);
          if (res.success) {
            setProfileUser(res.data);
          } else {
            setProfileError('User not found.');
          }
        } else if (authUser) {
          const res = await api.get('/users/me');
          if (res.success) {
            setProfileUser(res.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setProfileError(err.message || 'Failed to load profile.');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [id, authUser]);

  // Local state for editing fields (only relevant if isOwner)
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  
  const [isEditingMajor, setIsEditingMajor] = useState(false);
  const [majorText, setMajorText] = useState("");

  const [isEditingCampus, setIsEditingCampus] = useState(false);
  const [campusText, setCampusText] = useState("");

  // Sync state when profileUser loads
  useEffect(() => {
    if (profileUser) {
      setBioText(profileUser.bio || "Welcome to my Campus 360 profile! I keep my gear in great condition.");
      setMajorText(profileUser.department || "Undecided");
      setCampusText(profileUser.preferredPickupZones?.[0] || profileUser.yearOfStudy || "General Campus");
    }
  }, [profileUser]);

  if (id && !profileLoading && !profileUser) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-main, #374151)' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>User Not Found</h2>
        <p style={{ color: 'var(--text-muted, #6b7280)' }}>{profileError || 'The profile you are looking for does not exist or has been removed.'}</p>
      </div>
    );
  }

  // Show loading state when fetching another user's profile
  if (id && profileLoading && !profileUser) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-main, #374151)' }}>
        <p style={{ color: 'var(--text-muted, #6b7280)' }}>Loading profile...</p>
      </div>
    );
  }

  // Define display data with safe fallbacks
  const displayName = profileUser?.fullName || authUser?.fullName || "Campus User";
  const userEmail = profileUser?.collegeEmail || authUser?.collegeEmail || "hidden@campus.edu";
  const userRating = profileUser?.lenderRating || 4.9;
  const userReviewsCount = profileUser?.ratingsCount || 0;
  const itemsLent = profileUser?.listings?.length || 0;
  const itemsBorrowed = profileUser?.borrowingCount || 0;
  const pickupZones = profileUser?.preferredPickupZones || ["General Campus Area"];
  const userIdForShare = profileUser?.id || authUser?.id || "";

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/user/${userIdForShare}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Card shadow for elevated feel
  const cardStyle = {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.025)',
    border: 'none'
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', padding: isOwner ? '0' : '32px' }}>
      
      {/* 1. Header Card (Elevated Identity) */}
      <div style={{ 
        ...cardStyle,
        padding: '32px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '24px'
      }}>
        <div style={{ 
          width: '100px', height: '100px', 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          fontWeight: 'bold',
          boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)'
        }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', margin: 0, color: 'var(--text-main, #1f2937)', fontWeight: '700' }}>{displayName}</h1>
            <span style={{ 
              background: '#ecfdf5', color: '#047857', 
              padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '4px',
              border: '1px solid #10b981'
            }}>
              ✓ Verified Student
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted, #6b7280)', fontSize: '15px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
               🎓 
               {isEditingCampus && isOwner ? (
                 <input autoFocus value={campusText} onChange={e => setCampusText(e.target.value)} onBlur={() => setIsEditingCampus(false)} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px' }} />
               ) : (
                 <span onDoubleClick={() => isOwner && setIsEditingCampus(true)} style={{ cursor: isOwner ? 'pointer' : 'default', transition: 'color 0.2s' }} className={isOwner ? "hover-edit" : ""}>{campusText}</span>
               )}
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
               📚 
               {isEditingMajor && isOwner ? (
                 <input autoFocus value={majorText} onChange={e => setMajorText(e.target.value)} onBlur={() => setIsEditingMajor(false)} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px' }} />
               ) : (
                 <span onDoubleClick={() => isOwner && setIsEditingMajor(true)} style={{ cursor: isOwner ? 'pointer' : 'default', transition: 'color 0.2s' }} className={isOwner ? "hover-edit" : ""}>{majorText}</span>
               )}
             </div>
          </div>
        </div>

        <button 
          onClick={handleShareProfile}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '8px', 
            border: copied ? '1px solid #10b981' : '1px solid var(--border-color, #e5e7eb)',
            background: copied ? '#ecfdf5' : '#fff',
            color: copied ? '#047857' : 'var(--text-main, #1f2937)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
          {copied ? '✓ Copied!' : '📤 Share Profile'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
                👤 About Me
              </h2>
              {isOwner && (
                <button 
                  onClick={() => setIsEditingBio(!isEditingBio)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary-color, #0d9488)', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                  {isEditingBio ? 'Save' : 'Edit'}
                </button>
              )}
            </div>
            
            {isEditingBio && isOwner ? (
              <textarea 
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                style={{ width: '100%', minHeight: '120px', padding: '16px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', fontSize: '15px' }}
              />
            ) : (
              <p style={{ color: 'var(--text-main, #374151)', lineHeight: '1.7', margin: 0, fontSize: '15px' }}>
                {bioText}
              </p>
            )}
          </div>

          <div style={cardStyle}>
             <h2 style={{ fontSize: '18px', margin: 0, marginBottom: '16px', color: '#111827' }}>
                📍 Preferred Pickup Zones
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {pickupZones.map(zone => (
                  <span key={zone} style={{ background: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: '500' }}>{zone}</span>
                ))}
              </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Trust Reputation Card */}
          <div style={{ 
            ...cardStyle, 
            background: 'linear-gradient(to bottom right, #ffffff, #f0fdf4)',
            border: '1px solid #bbf7d0'
          }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#047857', margin: '0 0 16px 0', fontWeight: '700' }}>Lending Reputation</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '40px', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center' }}>
                {userRating}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <div style={{ color: '#fbbf24', fontSize: '18px', display: 'flex', gap: '2px' }}>
                   ★★★★★
                 </div>
                 <div style={{ color: '#047857', fontSize: '14px', fontWeight: '500' }}>Trusted by {userReviewsCount} students</div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted, #6b7280)', margin: '0 0 16px 0', fontWeight: '600' }}>Verification Level</h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857', fontSize: '20px' }}>
                🛡️
              </div>
              <div>
                <div style={{ color: '#111827', fontWeight: '600', marginBottom: '4px', fontSize: '15px' }}>
                  University ID Verified
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)' }}>
                  {isOwner ? userEmail : "Hidden for privacy"}
                </div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted, #6b7280)', margin: '0 0 16px 0', fontWeight: '600' }}>Platform Activity</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <div style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)', fontWeight: '500' }}>Items Lent</div>
                 <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{itemsLent}</div>
               </div>
               <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <div style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)', fontWeight: '500' }}>Borrowed</div>
                 <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{itemsBorrowed}</div>
               </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Profile;
