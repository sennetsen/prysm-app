import React, { useEffect, useState } from 'react';
import { Avatar } from 'antd';
import './MentionDropdown.css';

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface MentionDropdownProps {
  isVisible: boolean;
  users: User[];
  searchTerm: string;
  onSelectUser: (user: User) => void;
  position: { top: number; left: number };
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  isVisible,
  users,
  searchTerm,
  onSelectUser,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allOptions, setAllOptions] = useState<User[]>([]);

  const updateDropdownPosition = () => {
    // This function is intentionally empty as the position is controlled by the parent component
    // The position prop is already being used in the component's style
  };

  // Update filtered options when search term changes
  useEffect(() => {
    // Filter users whose usernames or full names START with the search term
    const filteredUsers = users.filter(
      (user) =>
        user.username.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().startsWith(searchTerm.toLowerCase()))
    );

    const options: User[] = [];

    // Check if "everyone" starts with the search term
    if ('everyone'.startsWith(searchTerm.toLowerCase())) {
      const everyone = {
        id: 'everyone',
        username: 'Everyone',
        avatar_url: '',
      };
      options.push(everyone);
    }

    // Add the filtered users
    options.push(...filteredUsers);

    setAllOptions(options);
    setSelectedIndex(0);

    // Debug logging
    console.log('MentionDropdown options updated:', {
      searchTerm,
      optionsCount: options.length,
      isVisible
    });
  }, [searchTerm, users]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || allOptions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev < allOptions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          onSelectUser(allOptions[selectedIndex]);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, allOptions, selectedIndex, onSelectUser]);

  useEffect(() => {
    if (isVisible) {
      updateDropdownPosition();
    }
  }, [isVisible, position]);

  // If not visible or no matches found, don't show the dropdown
  if (!isVisible || allOptions.length === 0) {
    return null;
  }

  return (
    <div className="mention-dropdown" data-testid="mention-dropdown">
      {allOptions.map((user, index) => (
        <div
          key={user.id || index}
          className={`mention-item ${user.id === 'everyone' ? 'everyone-item' : ''} ${index === selectedIndex ? 'selected-item' : ''
            }`}
          onClick={() => onSelectUser(user)}
        >
          {user.id === 'everyone' ? (
            <>
              <div className="everyone-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="mention-username">
                Everyone <span className="user-count">({users.length})</span>
              </div>
            </>
          ) : (
            <>
              <Avatar
                src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`}
                size={24}
                className="mention-avatar"
              />
              <span className="mention-username">{user.username}</span>
              {user.full_name && <span className="mention-fullname">{user.full_name}</span>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}; 