import React, { useState, useEffect } from "react";
import "./RequestCard.css";
import { supabase } from "../supabaseClient";

function RequestCard({ id, title, content, isAnonymous, color, authorId, author, created_at, onDelete, currentUserId, setUser }) {
  const [reactions, setReactions] = useState([]);
  const [timestamp, setTimestamp] = useState('');

  // Check if the current user can delete the post
  const canDelete = currentUserId && authorId === currentUserId;

  useEffect(() => {
    console.log("Current User ID:", currentUserId);
    console.log("Author ID:", authorId);
  }, [currentUserId, authorId]);

  const toggleReaction = async (reactionType = 'like') => {
    if (!currentUserId) return;

    try {
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select()
        .eq('post_id', id)
        .eq('user_id', currentUserId)
        .eq('reaction_type', reactionType)
        .single();

      if (existingReaction) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (!error) {
          setReactions(reactions.filter(r => r.id !== existingReaction.id));
        }
      } else {
        const { data, error } = await supabase
          .from('reactions')
          .insert({
            post_id: id,
            user_id: currentUserId,
            reaction_type: reactionType
          })
          .select();

        if (!error && data) {
          setReactions([...reactions, data[0]]);
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  useEffect(() => {
    const createdTime = new Date(created_at);
    const updateTimestamp = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now - createdTime) / 1000);

      if (diffInSeconds < 60) {
        setTimestamp('just now');
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        setTimestamp(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimestamp(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setTimestamp(`${days} day${days > 1 ? 's' : ''} ago`);
      }
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 60000);
    return () => clearInterval(interval);
  }, [created_at]);

  const handleSignInWithGoogle = async (response) => {
    try {
      const { credential } = response;

      const { data: { user }, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (authError) throw authError;

      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const profilePictureUrl = user.user_metadata.avatar_url || user.user_metadata.picture;

      // If user doesn't exist and there's no other error
      if (!existingUser && (!fetchError || fetchError.code === 'PGRST116')) {
        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.user_metadata.name,
          created_at: new Date().toISOString(),
          last_sign_in: new Date().toISOString(),
        };

        // Only add avatar_url if it exists
        if (profilePictureUrl) {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(`${user.id}.png`, await fetch(profilePictureUrl).then(res => res.blob()));

          if (uploadError) {
            console.error('Error uploading profile picture:', uploadError);
            return;
          }

          const { publicURL } = supabase.storage.from('profile-pictures').getPublicUrl(`${user.id}.png`);
          userData.avatar_url = publicURL; // Add avatar_url only if it was uploaded
        }

        const { error: insertError } = await supabase
          .from('users')
          .insert([userData]);

        if (insertError) {
          console.error('Error inserting user:', insertError);
          throw insertError;
        }
      } else if (existingUser) {
        // Handle existing user logic...
      }

      setUser(user);
    } catch (error) {
      console.error('Error in handleSignInWithGoogle:', error);
    }
  };

  return (
    <div className="request-card" style={{ backgroundColor: color }}>
      {canDelete && (
        <button className="delete-button" onClick={() => onDelete(id)}>
          ✕
        </button>
      )}
      <h3>{title}</h3>
      <p>{content}</p>
      <div className="card-footer">
        <div className={isAnonymous ? "anonymous" : "user-info"}>
          {!isAnonymous && author?.avatar_url && (
            <img src={author.avatar_url} alt="Profile" className="profile-pic" />
          )}
          <span>{isAnonymous ? 'Anonymous' : (author?.full_name || 'Unknown')}</span>
        </div>
        <div className="timestamp">{timestamp}</div>
        <button
          className={`like-button ${reactions.some(r => r.user_id === currentUserId) ? 'liked' : ''}`}
          onClick={() => toggleReaction('like')}
        >
          ❤️
        </button>
      </div>
    </div>
  );
}

export default RequestCard;