import axios from 'axios';

export const API = axios.create({ baseURL: 'http://localhost:3000/api' });

let _authState = null;
let _setAuthState = null;

export function setAuthRef(authState, setAuthState) {
  _authState = authState;
  _setAuthState = setAuthState;
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      _authState?.refresh_token
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.post('http://localhost:3000/api/auth/refresh', {
          refresh_token: _authState.refresh_token,
        });

        const newTokens = res.data.data;
        const updatedAuth = {
          ..._authState,
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
        };

        _authState = updatedAuth;
        if (_setAuthState) _setAuthState(updatedAuth);

        API.defaults.headers.common.Authorization = `Bearer ${newTokens.access_token}`;
        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return API(originalRequest);
      } catch (refreshError) {
        _authState = null;
        if (_setAuthState) _setAuthState(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
