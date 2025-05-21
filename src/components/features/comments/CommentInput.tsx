// CommentInput.tsx
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Input, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { supabase } from '../../../supabaseClient';
import { storage } from '../../../lib/storage';
import { MentionDropdown } from './MentionDropdown';
import { MentionDebugger } from './MentionDebugger';
import './CommentInput.css';

const { TextArea } = Input;

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  type?: string;
}

interface MentionData {
  id: string;
  username: string;
  type: 'user' | 'everyone';
}

interface CommentInputProps {
  postId: string;
  parentCommentId?: number;
  onSubmit: () => void;
  currentUser: {
    id: string;
  };
}

// Mock users for mention dropdown (replace with actual data in your app)
const mockUsers: User[] = [
  { id: '1', username: 'johndoe', full_name: 'John Doe', avatar_url: 'https://via.placeholder.com/24' },
  { id: '2', username: 'janedoe', full_name: 'Jane Doe', avatar_url: 'https://via.placeholder.com/24' },
  { id: '3', username: 'samsmith', full_name: 'Sam Smith', avatar_url: 'https://via.placeholder.com/24' },
  { id: '4', username: 'alexjones', full_name: 'Alex Jones', avatar_url: 'https://via.placeholder.com/24' },
  { id: '5', username: 'taylorlee', full_name: 'Taylor Lee', avatar_url: 'https://via.placeholder.com/24' },
];

export function CommentInput({
  postId,
  parentCommentId,
  onSubmit,
  currentUser,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Mention related state
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentions, setMentions] = useState<MentionData[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    dropdownVisible: false,
    searchTerm: '',
    cursorPosition: 0
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle file upload change
  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  // Handle text input changes and detect @ symbol
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputText = e.target.value;
    setContent(inputText);

    // Get cursor position
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = inputText.substring(0, cursorPosition);

    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1 && (lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === ' ')) {
      const searchText = textBeforeCursor.substring(lastAtSymbol + 1);

      // Only show dropdown if we're at the end of the @ sequence
      if (cursorPosition === lastAtSymbol + 1 + searchText.length) {
        setMentionSearch(searchText);
        setMentionStartIndex(lastAtSymbol);
        updateDropdownPosition();
        setShowMentionDropdown(true);

        // For debugging
        setDebugInfo({
          dropdownVisible: true,
          searchTerm: searchText,
          cursorPosition
        });

        console.log('Show dropdown:', {
          searchText,
          lastAtSymbol,
          cursorPosition
        });
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
      setMentionStartIndex(-1);
    }
  };

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    setDropdownPosition({
      top: rect.height + scrollTop,
      left: rect.left + scrollLeft
    });

    console.log('Dropdown position updated:', {
      height: rect.height,
      top: rect.height + scrollTop,
      left: rect.left + scrollLeft,
      rectTop: rect.top,
      rectLeft: rect.left,
      scrollTop,
      scrollLeft
    });
  };

  // Listen for window resize and scroll events
  useEffect(() => {
    if (showMentionDropdown) {
      const handlePositionUpdate = () => {
        updateDropdownPosition();
      };

      window.addEventListener('resize', handlePositionUpdate);
      window.addEventListener('scroll', handlePositionUpdate);

      // Initial update
      handlePositionUpdate();

      return () => {
        window.removeEventListener('resize', handlePositionUpdate);
        window.removeEventListener('scroll', handlePositionUpdate);
      };
    }
  }, [showMentionDropdown]);

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          break;
        case 'Escape':
          e.preventDefault();
          setShowMentionDropdown(false);
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Insert a mention tag
  const insertMention = (user: User) => {
    if (!inputRef.current || mentionStartIndex === -1) return;

    const mention: MentionData = {
      id: user.id,
      username: user.username,
      type: user.id === 'everyone' ? 'everyone' : 'user',
    };

    // Add to mentions list
    setMentions([...mentions, mention]);

    // Get the current text
    const currentText = content;
    const cursorPos = inputRef.current.selectionStart || 0;

    // Replace the @search text with the mention tag format
    const mentionText = `@${mention.username} `;
    const newContent =
      currentText.substring(0, mentionStartIndex) +
      mentionText +
      currentText.substring(cursorPos);

    setContent(newContent);

    // Clear mention state
    setShowMentionDropdown(false);
    setMentionSearch('');
    setMentionStartIndex(-1);

    // Focus back on input with cursor at the right position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPosition = mentionStartIndex + mentionText.length;
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Format text with mention highlighting for display
  const formatTextWithMentions = (text: string): string => {
    let formattedText = text;
    mentions.forEach(mention => {
      const mentionText = `@${mention.username}`;
      const mentionClass = mention.type === 'everyone' ? 'mention-everyone' : '';
      formattedText = formattedText.replace(
        mentionText,
        `<span class="mention-tag ${mentionClass}">${mentionText}</span>`
      );
    });
    return formattedText;
  };

  // Submit the comment with mentions
  const handleSubmit = async () => {
    if (!content.trim() && fileList.length === 0) return;
    setLoading(true);

    try {
      // Store mentions data in the comment metadata
      const mentionsData = mentions.map(m => ({
        id: m.id,
        username: m.username,
        type: m.type
      }));

      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          parent_comment_id: parentCommentId,
          content: content.trim(),
          author_id: currentUser.id,
          is_anonymous: false,
          mentions: mentionsData // Store mentions data
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

      // Reset form state
      setContent('');
      setFileList([]);
      setMentions([]);

      // Call the onSubmit callback
      onSubmit();
    } catch (error) {
      console.error('Error submitting comment:', error);
      message.error('Failed to submit comment');
    } finally {
      setLoading(false);
    }
  };

  // Handle custom backspace to delete entire mention tags
  const handleBackspace = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Backspace' && inputRef.current) {
      const cursorPos = inputRef.current.selectionStart || 0;

      // Only process if not a range selection
      if (inputRef.current.selectionStart === inputRef.current.selectionEnd) {
        // Check if there's a mention tag right before the cursor
        mentions.forEach(mention => {
          const mentionText = `@${mention.username} `;
          const mentionStart = content.lastIndexOf(mentionText, cursorPos);

          // If cursor is right after a mention, delete the whole mention
          if (mentionStart !== -1 && mentionStart + mentionText.length === cursorPos) {
            e.preventDefault();

            // Remove the mention from content
            const newContent =
              content.substring(0, mentionStart) +
              content.substring(cursorPos);

            setContent(newContent);

            // Remove from mentions array
            setMentions(mentions.filter((m, i) =>
              !(m.id === mention.id && m.username === mention.username)
            ));

            // Set cursor position
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(mentionStart, mentionStart);
              }
            }, 0);
          }
        });
      }
    }
  };

  return (
    <div className="comment-input-container" ref={containerRef}>
      <div className="comment-input-wrapper" style={{ position: 'relative' }}>
        <TextArea
          ref={inputRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            handleKeyDown(e);
            handleBackspace(e);
          }}
          placeholder="Write a comment..."
          autoSize={{ minRows: 1, maxRows: 6 }}
          className="comment-input"
        />

        {/* Mention Dropdown */}
        {showMentionDropdown && (
          <div className="mention-dropdown-container">
            <MentionDropdown
              isVisible={true}
              users={mockUsers}
              searchTerm={mentionSearch}
              onSelectUser={insertMention}
              position={dropdownPosition}
            />
          </div>
        )}
      </div>

      {/* Debugger */}
      <MentionDebugger
        isVisible={showMentionDropdown}
        searchTerm={mentionSearch}
        position={dropdownPosition}
      />

      <div className="comment-input-footer">
        <Upload
          fileList={fileList}
          onChange={handleUploadChange}
          beforeUpload={() => false}
          multiple
          maxCount={3}
        >
          <Button icon={<UploadOutlined />} />
        </Upload>
        <Button
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!content.trim() && fileList.length === 0}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
