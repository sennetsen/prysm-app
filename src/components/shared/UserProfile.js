import React from 'react';
import { supabase } from '../../supabaseClient';
import Avatar from './Avatar';

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
  // Create a user object for the Avatar component
  const avatarUser = {
    full_name: user.user_metadata.name,
    avatar_url: user.user_metadata.picture,
    avatar_storage_path: user.user_metadata.avatar_storage_path,
    id: user.id
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    }}>
      <Avatar
        user={avatarUser}
        size={36}
        style={{
          border: '2px solid white'
        }}
      />
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