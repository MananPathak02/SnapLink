/**
 * SnapLink API Base Configuration
 * Automatically switches between local development server and Render production backend.
 */
const API_BASE_URL = (function () {
  if (typeof window !== 'undefined' && window.SNAPLINK_API_URL) {
    return window.SNAPLINK_API_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // NOTE: Replace 'https://snaplink-backend.onrender.com' with your actual Render Web Service URL
  const renderProductionUrl = 'https://snaplink-backend.onrender.com';
  
  return isLocal ? 'http://127.0.0.1:5000' : renderProductionUrl;
})();
