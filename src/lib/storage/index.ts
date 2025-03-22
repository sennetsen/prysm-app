import { supabase } from '../../supabaseClient';
import 'antd';

export interface StorageProvider {
  upload(file: File, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}

export class SupabaseStorage implements StorageProvider {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file);

    if (error) throw error;
    return path;
  }

  async delete(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) throw error;
  }

  getPublicUrl(path: string): string {
    return supabase.storage
      .from(this.bucket)
      .getPublicUrl(path)
      .data.publicUrl;
  }
}

// Export a default instance
export const storage = new SupabaseStorage('attachments');
