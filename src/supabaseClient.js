import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState, useRef } from 'react';
import UserProfile from './components/UserProfile';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create a single instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export the GoogleSignInButton component
export { GoogleSignInButton };

function GoogleSignInButton({ onClick, onSuccess }) {
  const [user, setUser] = useState(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
  }, [user]);

  const handleSignInWithGoogle = async (response) => {
    try {
      const { credential } = response;

      const { data: { user }, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (authError) throw authError;

      const currentTime = new Date().toISOString();

      // Check if user exists in your users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!existingUser) {
        // For new users
        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.user_metadata.name,
          avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
          created_at: currentTime,
          last_sign_in: currentTime
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([userData]);

        if (insertError) throw insertError;
      } else {
        // For existing users
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_sign_in: currentTime })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      setUser(user);
      if (onSuccess) {
        onSuccess({ user });
      }
    } catch (error) {
      console.error('Error in handleSignInWithGoogle:', error);
    }
  };

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

