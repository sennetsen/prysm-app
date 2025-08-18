import { supabase } from '../supabaseClient';

/**
 * Upload avatar to R2 storage
 */
export async function uploadAvatarToR2(file, userId) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('fileName', file.name);

    const response = await fetch('https://prysm-r2-worker.prysmapp.workers.dev/avatar/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload avatar: ${response.statusText}`);
    }

    const result = await response.json();
    return result.storage_path;
  } catch (error) {
    console.error('Error uploading avatar to R2:', error);
    throw error;
  }
}

/**
 * Delete avatar from R2 storage
 */
export async function deleteAvatarFromR2(storagePath) {
  try {
    const response = await fetch(`https://prysm-r2-worker.prysmapp.workers.dev/delete/${storagePath}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete avatar: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting avatar from R2:', error);
    throw error;
  }
}

/**
 * Sync user avatar with Google profile picture
 */
export async function syncUserAvatar(user) {
  try {
    if (!user || !user.user_metadata?.avatar_url) {
      console.log('No user or avatar URL to sync');
      return;
    }

    const googleAvatarUrl = user.user_metadata.avatar_url;
    console.log('Syncing avatar for user:', user.id, 'URL:', googleAvatarUrl);

    // Check if user already exists in our database
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('avatar_url, avatar_storage_path')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing user:', fetchError);
      return;
    }

    // If user doesn't exist or avatar URL has changed, sync the avatar
    if (!existingUser || existingUser.avatar_url !== googleAvatarUrl || !existingUser.avatar_storage_path) {
      console.log('Avatar needs syncing, existing:', existingUser?.avatar_url, 'new:', googleAvatarUrl, 'has storage path:', !!existingUser?.avatar_storage_path);

      // Download the avatar from Google CDN
      let avatarResponse;
      try {
        avatarResponse = await fetch(googleAvatarUrl);
      } catch (fetchError) {
        console.warn('Network error fetching avatar from Google CDN:', fetchError.message);
        console.warn('Storing Google CDN URL in database for fallback display.');
        
        // Even if we can't download, store the Google CDN URL for display
        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          avatar_url: googleAvatarUrl,
          avatar_storage_path: null, // Will be null since we can't download
          last_sign_in: new Date().toISOString()
        };
        
        const { error: upsertError } = await supabase
          .from('users')
          .upsert([userData], { onConflict: 'id' });
          
        if (upsertError) {
          console.error('Error upserting user with Google CDN URL:', upsertError);
        } else {
          console.log('✅ User record updated with Google CDN URL (R2 sync skipped)');
        }
        return;
      }
      
      if (!avatarResponse.ok) {
        console.warn('Failed to fetch avatar from Google CDN, status:', avatarResponse.status);
        console.warn('Storing Google CDN URL in database for fallback display.');
        
        // Even if we can't download, store the Google CDN URL for display
        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          avatar_url: googleAvatarUrl,
          avatar_storage_path: null, // Will be null since we can't download
          last_sign_in: new Date().toISOString()
        };
        
        const { error: upsertError } = await supabase
          .from('users')
          .upsert([userData], { onConflict: 'id' });
          
        if (upsertError) {
          console.error('Error upserting user with Google CDN URL:', upsertError);
        } else {
          console.log('✅ User record updated with Google CDN URL (R2 sync skipped)');
        }
        return;
      }

      const avatarBlob = await avatarResponse.blob();
      const avatarFile = new File([avatarBlob], 'avatar.jpg', { type: avatarBlob.type });

      // Upload to R2
      const storagePath = await uploadAvatarToR2(avatarFile, user.id);
      console.log('Avatar uploaded to R2:', storagePath);

      // Delete old avatar from R2 if it exists
      if (existingUser?.avatar_storage_path && existingUser.avatar_storage_path !== storagePath) {
        try {
          await deleteAvatarFromR2(existingUser.avatar_storage_path);
          console.log('Old avatar deleted from R2:', existingUser.avatar_storage_path);
        } catch (deleteError) {
          console.warn('Failed to delete old avatar:', deleteError);
        }
      }

      // Update or insert user record
      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        avatar_url: googleAvatarUrl,
        avatar_storage_path: storagePath,
        last_sign_in: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('users')
        .upsert([userData], { onConflict: 'id' });

      if (upsertError) {
        console.error('Error upserting user:', upsertError);
        throw upsertError;
      }

      console.log('User avatar synced successfully');
    } else {
      console.log('Avatar already up to date');
    }
  } catch (error) {
    console.error('Error syncing user avatar:', error);
    throw error;
  }
}

/**
 * Get the best available avatar URL for a user
 */
export function getBestAvatarUrl(user) {
  if (!user) return null;
  
  // Priority 1: R2 storage path
  if (user.avatar_storage_path) {
    return `https://prysm-r2-worker.prysmapp.workers.dev/file/${user.avatar_storage_path}`;
  }
  
  // Priority 2: Google CDN URL
  if (user.avatar_url) {
    return user.avatar_url;
  }
  
  // No avatar available
  return null;
}
