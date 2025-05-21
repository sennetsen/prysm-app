import React from 'react';
import { supabase } from '../../supabaseClient';

export const handleSignOut = async (onSignOut, user) => {
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
    window.location.reload();
    onSignOut();
  } catch (error) {
    if (error.message !== 'Auth session missing!') {
      console.error('Error signing out:', error);
    }
    // Always call onSignOut to ensure UI state is updated
    window.location.reload();
    onSignOut();
  }
};

function UserProfile({ user, onSignOut, totalUserRequests }) {
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
    </div>
  );
}

export default UserProfile; 