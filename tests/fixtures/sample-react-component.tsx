import React, { useState } from 'react';

interface UserProfileProps {
  userId: string;
  name: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, name }) => {
  const [loading, setLoading] = useState(false);

  const handleFetchData = async () => {
    setLoading(true);
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    setLoading(false);
    return data;
  };

  return (
    <div>
      <h1>{name}</h1>
      <button onClick={handleFetchData}>Load Data</button>
    </div>
  );
};

