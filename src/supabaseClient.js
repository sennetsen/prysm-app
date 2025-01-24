import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState, useRef } from 'react';
import UserProfile from './components/UserProfile';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create a single instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export the GoogleSignInButton component
export { GoogleSignInButton };

function GoogleSignInButton() {
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
            theme: "outline",
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

      // After successful authentication, store user data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const profilePictureUrl = user.user_metadata.avatar_url || user.user_metadata.picture;

      // If user doesn't exist and there's no other error
      if (!existingUser && (!fetchError || fetchError.code === 'PGRST116')) {
        // Upload the profile picture to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(`public/${user.id}.png`, await fetch(profilePictureUrl).then(res => res.blob()));

        if (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          return;
        }

        // Get the public URL of the uploaded image
        const { publicURL } = supabase.storage.from('profile-pictures').getPublicUrl(`public/${user.id}.png`);

        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.user_metadata.name,
          avatar_url: publicURL, // Use the uploaded image URL
          created_at: new Date().toISOString(),
          last_sign_in: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([userData]);

        if (insertError) {
          console.error('Error inserting user:', insertError);
          throw insertError;
        }
      } else if (existingUser) {
        // Check if the profile picture has changed
        if (existingUser.avatar_url !== profilePictureUrl) {
          // Upload the new profile picture to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(`public/${user.id}.png`, await fetch(profilePictureUrl).then(res => res.blob()));

          if (uploadError) {
            console.error('Error uploading new profile picture:', uploadError);
            return;
          }

          // Get the public URL of the uploaded image
          const { publicURL } = supabase.storage.from('profile-pictures').getPublicUrl(`public/${user.id}.png`);

          // Update the user's avatar_url in the database
          const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: publicURL })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error updating user profile picture:', updateError);
            throw updateError;
          }
        }

        // Update last sign in time for existing users
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_sign_in: new Date().toISOString() })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user:', updateError);
          throw updateError;
        }
      }

      setUser(user);
    } catch (error) {
      console.error('Error in handleSignInWithGoogle:', error);
    }
  };

  if (user) {
    return <UserProfile user={user} onSignOut={() => setUser(null)} />;
  }

  return (
    <div
      ref={buttonRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px'
      }}
    />
  );
}

