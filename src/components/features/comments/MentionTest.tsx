import React, { useState } from 'react';
import { Button, Input } from 'antd';
import { MentionDropdown } from './MentionDropdown';
import { MentionDebugger } from './MentionDebugger';
import './MentionDropdown.css';

const { TextArea } = Input;

// Simple test component to isolate and debug the mentions functionality
export const MentionTest: React.FC = () => {
  const [content, setContent] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock users for testing
  const users = [
    { id: '1', username: 'johndoe', full_name: 'John Doe', avatar_url: 'https://via.placeholder.com/24' },
    { id: '2', username: 'janedoe', full_name: 'Jane Doe', avatar_url: 'https://via.placeholder.com/24' }
  ];

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);

    // Check for @ symbol
    const lastIndexOfAt = text.lastIndexOf('@');
    if (lastIndexOfAt !== -1) {
      const afterAt = text.substring(lastIndexOfAt + 1);
      setSearchTerm(afterAt);
      setShowDropdown(true);
      console.log('Found @ symbol:', { afterAt, lastIndexOfAt });
    } else {
      setShowDropdown(false);
    }
  };

  // Handle user selection
  const handleSelectUser = (user: any) => {
    setContent(content + user.username + ' ');
    setShowDropdown(false);
    console.log('Selected user:', user);
  };

  // Toggle dropdown for testing
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    console.log('Dropdown toggled:', !showDropdown);
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '40px auto',
      padding: '20px',
      border: '1px solid #eee',
      position: 'relative',
      borderRadius: '8px'
    }}>
      <h2>Mention Test</h2>
      <p>Type @ to trigger the mention dropdown</p>

      <div style={{ position: 'relative', marginBottom: '50px' }}>
        <TextArea
          value={content}
          onChange={handleInputChange}
          placeholder="Type @ to mention someone..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          style={{ width: '100%', marginBottom: '10px' }}
        />

        {/* Direct implementation for testing */}
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 9999,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            width: '250px'
          }}>
            <MentionDropdown
              isVisible={true}
              users={users}
              searchTerm={searchTerm}
              onSelectUser={handleSelectUser}
              position={{ top: 0, left: 0 }}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <Button onClick={toggleDropdown} type="primary">
          {showDropdown ? 'Hide' : 'Show'} Dropdown (Test)
        </Button>
      </div>

      <MentionDebugger
        isVisible={showDropdown}
        searchTerm={searchTerm}
        position={{ top: 0, left: 0 }}
      />

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Debug Info:</h3>
        <p>Dropdown visible: {showDropdown ? 'Yes' : 'No'}</p>
        <p>Search term: "{searchTerm}"</p>
        <p>Current text: "{content}"</p>
      </div>
    </div>
  );
}; 