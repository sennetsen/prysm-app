import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import { supabase } from '../supabaseClient';
import { storage } from '../lib/storage';
import { PaperClipOutlined, SendOutlined } from '@ant-design/icons';
import './CommentInput.css';

interface CommentInputProps {
  postId: string;
  parentCommentId?: number;
  onSubmit: () => void;
  currentUser: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export function CommentInput({ postId, parentCommentId, onSubmit, currentUser }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;
    setLoading(true);

    try {
      // Create comment
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          parent_comment_id: parentCommentId,
          content: content.trim(),
          author_id: currentUser.id,
          is_anonymous: false,
          reaction_counts: {}
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Handle attachments
      if (files.length > 0) {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > 25 * 1024 * 1024) {
          throw new Error('Total attachments size exceeds 25MB');
        }

        for (const file of files) {
          const filePath = `comments/${postId}/${comment.id}/${file.name}`;
          await storage.upload(file, filePath);

          await supabase.from('attachments').insert({
            post_id: postId,
            comment_id: comment.id,
            storage_path: filePath,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size
          });
        }
      }

      setContent('');
      setFiles([]);
      onSubmit();
    } catch (error) {
      console.error('Error posting comment:', error);
      message.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-input-container">
      <Input.TextArea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Leave a comment..."
        rows={3}
        className="comment-textarea"
      />
      <div className="comment-actions">
        <label className="file-input-button">
          <PaperClipOutlined />
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSubmit}
          loading={loading}
          disabled={!content.trim() && files.length === 0}
          className="send-button"
        />
      </div>
      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <span>{file.name}</span>
              <button
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="remove-file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}