import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CompaniesContext = createContext(null);

export function CompaniesProvider({ children }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [companiesRes, usersRes] = await Promise.all([
        api.get('/companies'),
        api.get('/auth/users'),
      ]);
      setCompanies(companiesRes.data);
      setAllUsers(usersRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const updateCompany = useCallback((updated) => {
    setCompanies((prev) => prev.map((c) => (c.id === updated.id ? { ...updated, contacts: c.contacts, _count: c._count } : c)));
  }, []);

  const addCompany = useCallback((company) => {
    setCompanies((prev) => [company, ...prev]);
  }, []);

  const removeCompany = useCallback((id) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <CompaniesContext.Provider value={{ companies, allUsers, loading, refresh, updateCompany, addCompany, removeCompany }}>
      {children}
    </CompaniesContext.Provider>
  );
}

export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) throw new Error('useCompanies must be used within CompaniesProvider');
  return ctx;
}
