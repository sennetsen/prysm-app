import React from 'react';
import { supabase } from '../supabaseClient';

function UserProfile({ user, onSignOut, totalUserRequests }) {
  const handleSignOut = async () => {
    try {
      // Check if there's an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.log('No active session found, clearing local state');
        onSignOut();
        return;
      }

      // Only attempt to sign out if there's an active session
      const { error: signOutError } = await supabase.auth.signOut();
      if (window.google?.accounts?.id) {
        window.google.accounts.id.revoke(user.email, () => {
          console.log('Google session revoked');
        });
      }
      if (signOutError) throw signOutError;

      onSignOut();
    } catch (error) {
      if (error.message !== 'Auth session missing!') {
        console.error('Error signing out:', error);
      }
      // Always call onSignOut to ensure UI state is updated
      onSignOut();
    }
  };

  // Fallback to first letter of name if no avatar
  const getInitial = () => {
    return user.user_metadata.name ? user.user_metadata.name[0].toUpperCase() : '?';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    }}>
      {user.user_metadata.picture ? (
        <img
          src={user.user_metadata.picture}
          alt="Profile"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '2px solid white'
          }}
        />
      ) : (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '2px solid white',
          backgroundColor: '#ffffff33',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          fontWeight: '500'
        }}>
          {getInitial()}
        </div>
      )}
      <span style={{
        color: 'white',
        fontSize: '1.1rem',
        fontWeight: '500'
      }}>
        {user.user_metadata.name}
      </span>
      <button
        onClick={handleSignOut}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: '2px solid white',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: '500',
          transition: 'all 0.1s ease',
          backdropFilter: 'blur(5px)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

export default UserProfile; 