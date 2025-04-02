import React, { createContext, useContext, useState, ReactNode } from 'react';

// Create context
const AuthContext = createContext<any>(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authTokens, setAuthTokens] = useState<any>(null);
  const [user, setUser] = useState<any>(null); // Store user data here

  const setAuthTokensAndUser = (tokens: string, userData: any) => {
    setAuthTokens(tokens);
    setUser(userData);  // Store user data (username, attributes)
  };

  return (
    <AuthContext.Provider value={{ authTokens, user, setAuthTokensAndUser }}>
      {children}
    </AuthContext.Provider>
  );
};