import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import UserProfile from './components/shared/UserProfile';
import { syncUserAvatar } from './utils/avatarUtils';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create a single instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export the GoogleSignInButton component
export { GoogleSignInButton };

function GoogleSignInButton({ onClick, onSuccess }) {
  const [user, setUser] = useState(null);
  const buttonRef = useRef(null);

  const handleSignInWithGoogle = useCallback(async (response) => {
    try {
      const { credential } = response;

      const { data: { user }, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (authError) throw authError;

      setUser(user);
      if (onSuccess) {
        onSuccess({ user });
      }
    } catch (error) {
      console.error('Error in handleSignInWithGoogle:', error);
    }
  }, [onSuccess]);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Sync avatar when user signs in (handles profile picture updates)
        try {
          await syncUserAvatar(session.user);
        } catch (avatarError) {
          console.warn('❌ Auth state change - failed to sync avatar:', avatarError);
        }
      }
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let googleButton = null;

    if (!user && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: handleSignInWithGoogle
      });

      if (buttonRef.current) {
        googleButton = window.google.accounts.id.renderButton(
          buttonRef.current,
          {
            type: "standard",
            theme: "filled_black",
            size: "large",
            text: "signin_with",
            shape: "pill",
            logo_alignment: "left"
          }
        );
      }
    }

    return () => {
      if (googleButton) {
        // Clean up the button if it exists
        buttonRef.current?.childNodes.forEach(child => child.remove());
      }
    };
  }, [user, handleSignInWithGoogle]);

  useEffect(() => {
    const button = buttonRef.current;
    if (button) {
      button.addEventListener('click', handleSignInWithGoogle);
      return () => {
        button.removeEventListener('click', handleSignInWithGoogle);
      };
    }
  }, [handleSignInWithGoogle]);

  if (user) {
    return null;
  }

  return (
    <div
      ref={buttonRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
      }}
      onClick={onClick}
    />
  );
}

