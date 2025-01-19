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
        client_id: "63305175595-6mftaocn7r0gj8dinb33ru8qi4iofhge.apps.googleusercontent.com",
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
      console.log('Google response:', response);

      const { data: { user }, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (authError) throw authError;

      // Detailed logging of user data
      console.log('Full user object:', user);
      console.log('User metadata:', user.user_metadata);
      console.log('User ID:', user.id);
      console.log('User email:', user.email);

      // After successful authentication, store user data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')  // Select all columns
        .eq('id', user.id)
        .single();

      console.log('Existing user query result:', existingUser);
      console.log('Fetch error:', fetchError);

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingUser) {
        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.name,
          avatar_url: user.user_metadata.picture,
          created_at: new Date().toISOString(),
          last_sign_in: new Date().toISOString()
        };

        console.log('Attempting to insert user data:', userData);

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting user:', insertError);
          throw insertError;
        }

        console.log('New user created:', newUser);
      } else {
        console.log('Updating existing user:', existingUser);
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
      console.error('Full error object:', error);
      console.error('Error in handleSignInWithGoogle:', error.message);
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

