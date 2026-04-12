import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  activeBusiness: string;
  setActiveBusiness: (biz: string) => void;
}

const dummyUser = {
  uid: 'default-local-user',
  displayName: 'Business Owner',
  email: 'owner@smartvyapaar.local',
};

const AuthContext = createContext<AuthContextType>({ 
  user: dummyUser, 
  loading: false,
  activeBusiness: 'Business 1',
  setActiveBusiness: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeBusiness, setActiveBusiness] = useState('Business 1');

  return (
    <AuthContext.Provider value={{ user: dummyUser, loading: false, activeBusiness, setActiveBusiness }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
