/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { hasPermission as checkPermission } from './permissionUtils';

export const AuthContext = createContext(null);

const API_BASE = 'http://localhost:8001/api';
const TOKEN_KEY = 'erp_token';

// Helper to set/delete axios authorization header
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Token ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [menuData, setMenuData] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState(null);

  // Reload authentication data from backend
  const reloadAuth = useCallback(async (authToken) => {
    const activeToken = authToken || token || localStorage.getItem(TOKEN_KEY);
    if (!activeToken) {
      setIsLoading(false);
      return;
    }

    setAuthToken(activeToken);

    try {
      // 1. Fetch current user info
      const meRes = await axios.get(`${API_BASE}/auth/me/`);
      const userData = meRes.data;

      // 2. Fetch permissions & menu in parallel
      const [permRes, menuRes] = await Promise.all([
        axios.get(`${API_BASE}/auth/permissions/`),
        axios.get(`${API_BASE}/auth/menu/`),
      ]);

      setUser(userData);
      setToken(activeToken);

      const permPayload = permRes.data;
      const normalizedPerms = permPayload && typeof permPayload === 'object'
        ? (permPayload.data && typeof permPayload.data === 'object' && !Array.isArray(permPayload.data)
            ? permPayload.data
            : permPayload.results && typeof permPayload.results === 'object' && !Array.isArray(permPayload.results)
              ? permPayload.results
              : permPayload)
        : {};
      setPermissions(normalizedPerms);

      const menuPayload = menuRes.data;
      const normalizedMenu = Array.isArray(menuPayload)
        ? menuPayload
        : Array.isArray(menuPayload?.results)
          ? menuPayload.results
          : Array.isArray(menuPayload?.data)
            ? menuPayload.data
            : [];
      setMenuData(normalizedMenu);

      setIsAuthenticated(true);
    } catch (err) {
      console.error('Failed to reload auth state:', err);
      // Clean up token on auth failure (e.g. 401 Unauthorized)
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      setUser(null);
      setToken(null);
      setPermissions({});
      setMenuData([]);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initial restoration check on mount
  useEffect(() => {
    const initialToken = localStorage.getItem(TOKEN_KEY);
    if (initialToken) {
      reloadAuth(initialToken);
    } else {
      setIsLoading(false);
    }
  }, [reloadAuth]);

  // Axios response interceptor to handle 401 unauthorized (e.g. active session kicked)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const isLoginRequest = error.config && error.config.url && error.config.url.includes('/api/auth/login/');
        if (error.response && error.response.status === 401 && !isLoginRequest) {
          console.warn('API returned 401 Unauthorized. Session expired or kicked out. Clearing auth state.');
          localStorage.removeItem(TOKEN_KEY);
          setAuthToken(null);
          setUser(null);
          setToken(null);
          setPermissions({});
          setMenuData([]);
          setIsAuthenticated(false);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Login handler
  const login = async (username, password) => {
    setLoginError(null);
    try {
      const response = await axios.post(`${API_BASE}/auth/login/`, {
        username,
        password,
      });

      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      setAuthToken(receivedToken);

      setToken(receivedToken);
      setUser(receivedUser);
      setIsAuthenticated(true);

      // Load permissions and menu immediately after login
      try {
        const [permRes, menuRes] = await Promise.all([
          axios.get(`${API_BASE}/auth/permissions/`),
          axios.get(`${API_BASE}/auth/menu/`),
        ]);

        const permPayload = permRes.data;
        const normalizedPerms = permPayload && typeof permPayload === 'object'
          ? (permPayload.data && typeof permPayload.data === 'object' && !Array.isArray(permPayload.data)
              ? permPayload.data
              : permPayload.results && typeof permPayload.results === 'object' && !Array.isArray(permPayload.results)
                ? permPayload.results
                : permPayload)
          : {};
        setPermissions(normalizedPerms);

        const menuPayload = menuRes.data;
        const normalizedMenu = Array.isArray(menuPayload)
          ? menuPayload
          : Array.isArray(menuPayload?.results)
            ? menuPayload.results
            : Array.isArray(menuPayload?.data)
              ? menuPayload.data
              : [];
        setMenuData(normalizedMenu);
      } catch (loadErr) {
        console.error('Failed to load permissions/menu after login:', loadErr);
      }

      return true;
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        '登入失敗，請確認網路連線或帳號密碼。';
      setLoginError(errorMsg);
      throw new Error(errorMsg, { cause: err });
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout/`);
    } catch (err) {
      console.error('Backend logout call failed:', err);
    } finally {
      // Regardless of backend response, always clear local state
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      setUser(null);
      setToken(null);
      setPermissions({});
      setMenuData([]);
      setIsAuthenticated(false);
    }
  };

  // Check permission helper bound to AuthContext
  const hasPermission = useCallback((programId, action) => {
    return checkPermission(permissions, programId, action, user);
  }, [permissions, user]);

  const value = {
    user,
    token,
    permissions,
    menuData,
    isAuthenticated,
    isLoading,
    loginError,
    login,
    logout,
    reloadAuth,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
