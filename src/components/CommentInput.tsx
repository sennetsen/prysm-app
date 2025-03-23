// CommentInput.tsx
import React, { useState } from 'react';
import { Input, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { storage } from '../lib/storage';
import './CommentInput.css';

const { TextArea } = Input;

interface CommentInputProps {
  postId: string;
  parentCommentId?: number;
  onSubmit: () => void;
  currentUser: {
    id: string;
  };
}

export function CommentInput({
  postId,
  parentCommentId,
  onSubmit,
  currentUser,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const handleSubmit = async () => {
    if (!content.trim() && fileList.length === 0) return;
    setLoading(true);

    try {
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          parent_comment_id: parentCommentId,
          content: content.trim(),
          author_id: currentUser.id,
          is_anonymous: false,
          reaction_counts: {},
        })
        .select()
        .single();

      if (commentError) throw commentError;

      if (fileList.length > 0) {
        const totalSize = fileList.reduce(
          (sum, file) => sum + file.originFileObj.size,
          0
        );
        if (totalSize > 25 * 1024 * 1024) {
          throw new Error('Total attachments size exceeds 25MB');
        }
        for (const file of fileList) {
          const fileObj = file.originFileObj;
          const filePath = `comments/${postId}/${comment.id}/${fileObj.name}`;
          await storage.upload(fileObj, filePath);
          await supabase.from('attachments').insert({
            post_id: postId,
            comment_id: comment.id,
            storage_path: filePath,
            file_name: fileObj.name,
            file_type: fileObj.type,
            file_size: fileObj.size,
          });
        }
      }

      setContent('');
      setFileList([]);
      onSubmit();
    } catch (error) {
      console.error('Error posting comment:', error);
      message.error('Error posting comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-input-container">
      <TextArea
        rows={3}
        placeholder="Leave a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="comment-textarea"
      />
      <div className="input-actions">
        <Upload
          fileList={fileList}
          onChange={handleUploadChange}
          multiple
          beforeUpload={() => false}
        >
          <Button icon={<UploadOutlined />}>Attach</Button>
        </Upload>
        <Button
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          className="send-button"
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </div>
      {fileList.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {fileList.map((file, index) => (
            <div
              key={index}
              style={{
                background: '#f0f0f0',
                padding: '4px',
                borderRadius: '4px',
                marginBottom: '4px',
              }}
            >
              {file.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
