import React, { useEffect, useState } from 'react';
import './MentionDropdown.css';
import { Avatar } from '../../shared';

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  avatar_storage_path?: string;
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
        avatar_storage_path: '',
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

  if (!isVisible || allOptions.length === 0) {
    return null;
  }

  return (
    <div
      className="mention-dropdown"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
    >
      {allOptions.map((user, index) => (
        <div
          key={user.id}
          className={`mention-option ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelectUser(user)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <Avatar user={user} size={24} />
          <span className="mention-username">{user.username}</span>
          {user.full_name && user.full_name !== user.username && (
            <span className="mention-fullname">({user.full_name})</span>
          )}
        </div>
      ))}
    </div>
  );
}; 