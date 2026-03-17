import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, ArrowRight, Phone, Calendar, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import config from '../../Config/Config';

// Province/State data by country
const NEPAL_PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];
const INDIA_STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

// Country codes
const COUNTRY_CODES = [
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
];

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate(); // Initialize navigate function

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    street: '',
    city: '',
    province: '',
    country: 'Nepal',
    countryCode: '+977',
    phone: '',
    gender: '',
    dob: '',
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Get provinces/states based on selected country
  const getProvinces = () => {
    if (formData.country === 'India') return INDIA_STATES;
    return NEPAL_PROVINCES;
  };

  const validateSignup = (normalizedEmail) => {
    const emailOk = /(@gmail\.com|\.edu\.np)$/i.test(normalizedEmail);
    if (!emailOk) return 'Email must end with @gmail.com or .edu.np';

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!strongPassword.test(formData.password)) {
      return 'Password must be 8+ chars with uppercase, lowercase, number, and special character';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Password and confirm password do not match';
    }

    const phoneOk = /^\d{10}$/.test(formData.phone);
    if (!phoneOk) return 'Phone number must be exactly 10 digits';

    if (!formData.dob) return 'Date of birth is required';
    const today = new Date();
    const dob = new Date(formData.dob);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    if (age < 16) return 'You must be at least 16 years old to sign up';

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = formData.email.toLowerCase().trim();

    setError('');

    // ── Login validation ──
    if (isLogin) {
      if (!normalizedEmail) {
        setError('Email is required');
        return;
      }
      if (!formData.password) {
        setError('Password is required');
        return;
      }
    }

    // ── Signup validation ──
    if (!isLogin) {
      if (!formData.firstName.trim()) {
        setError('First name is required');
        return;
      }
      if (!formData.lastName.trim()) {
        setError('Last name is required');
        return;
      }
      const validationError = validateSignup(normalizedEmail);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (!formData.city.trim()) {
        setError('City is required');
        return;
      }
      if (!formData.gender) {
        setError('Please select your gender');
        return;
      }
    }

    setIsLoading(true);

    try {
      // ── All login/signup goes through authAPI (axios with JWT interceptor) ──
      let data;
      if (isLogin) {
        const response = await authAPI.login({ email: normalizedEmail, password: formData.password });
        data = response.data;
      } else {
        const response = await authAPI.register({ ...formData, email: normalizedEmail });
        data = response.data;
      }

      // ── Store JWT tokens ──
      if (data.access) {
        localStorage.setItem(config.AUTH_TOKEN_KEY, data.access);
      }
      if (data.refresh) {
        localStorage.setItem(config.REFRESH_TOKEN_KEY, data.refresh);
      }

      const userData = data.user || data;
      if (!userData.role) userData.role = 'customer';
      // Normalize field names (backend uses snake_case, frontend uses camelCase)
      if (userData.first_name && !userData.firstName) userData.firstName = userData.first_name;
      if (userData.last_name && !userData.lastName) userData.lastName = userData.last_name;
      login(userData);

      // ── Redirect based on role ──
      if (userData.role === 'owner') {
        navigate('/owner/dashboard');
      } else if (userData.role === 'warehouse') {
        navigate('/warehouse/dashboard');
      } else if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const status = err.response?.status;
      const raw = err.response?.data;
      // Sanitize: if raw is HTML (Django debug page), never show it
      const isHtml = typeof raw === 'string' && raw.trimStart().startsWith('<');
      const data = isHtml ? null : raw;
      let msg;
      if (status === 400 && (data?.email || (typeof data === 'object' && data !== null && JSON.stringify(data).toLowerCase().includes('already')))) {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (status === 401 || (status === 400 && isLogin)) {
        msg = 'Invalid email or password.';
      } else if (isHtml || !err.response) {
        msg = 'Server error. Please try again in a moment.';
      } else {
        msg = data?.message || data?.detail
          || (typeof data === 'object' ? Object.values(data).flat().join(' ') : null)
          || err.message
          || 'Failed to connect to the server.';
      }
      setError(msg);
      // Only clear password — keep email so user doesn't need to re-type
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } finally {
      setIsLoading(false);
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      if (/^\d*$/.test(value) && value.length <= 10) {
        setFormData({ ...formData, [name]: value });
      }
    } else if (name === 'country') {
      // When country changes, update country code and clear province
      const newCountryCode = value === 'India' ? '+91' : '+977';
      setFormData({ ...formData, country: value, countryCode: newCountryCode, province: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Toggle country code (slider switch)
  const toggleCountryCode = () => {
    const isNepal = formData.countryCode === '+977';
    const newCode = isNepal ? '+91' : '+977';
    const newCountry = isNepal ? 'India' : 'Nepal';
    setFormData({ ...formData, countryCode: newCode, country: newCountry, province: '' });
  };

  return (
    <div className="login-page">
      {error && <div className="error-popup">{error}</div>}
      <div className="login-card">
        <div className="login-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Customer Account'}</h2>
          <p>{isLogin ? 'Enter your credentials to access your account' : 'Sign up as a customer for a premium shopping experience'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          {!isLogin && (
            <>
              <div className="name-row">
                <div className="input-group">
                  <User size={20} className="input-icon" />
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="input-group">
                  <User size={20} className="input-icon" />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="name-row">
                <div className="input-group phone-group">
                  <Phone size={20} className="input-icon" />
                  <div className="country-code-toggle" onClick={toggleCountryCode} title="Click to switch country">
                    <span className="flag">{formData.countryCode === '+977' ? '🇳🇵' : '🇮🇳'}</span>
                    <span className="code">{formData.countryCode}</span>
                    <span className="toggle-indicator">↔</span>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="phone-input"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="input-group">
                  <Calendar size={20} className="input-icon" />
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    required
                    className="date-input"
                  />
                </div>
              </div>

              <div className="input-group gender-group">
                <span className="gender-label">Gender</span>
                <div className="gender-options">
                  <label><input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleChange} required /> Male</label>
                  <label><input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleChange} required /> Female</label>
                  <label><input type="radio" name="gender" value="other" checked={formData.gender === 'other'} onChange={handleChange} required /> Other</label>
                </div>
              </div>

              {/* Role Selector removed — only customers can register */}
            </>
          )}

          <div className="input-group">
            <Mail size={20} className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete={isLogin ? "username" : "off"}
            />
          </div>

          {!isLogin && (
            <div className="address-grid">
              <div className="input-group">
                <MapPin size={20} className="input-icon" />
                <input type="text" name="city" placeholder="City *" value={formData.city} onChange={handleChange} required autoComplete="off" />
              </div>
              <div className="input-group select-group">
                <MapPin size={20} className="input-icon" />
                <select name="province" value={formData.province} onChange={handleChange} className="province-select">
                  <option value="">{formData.country === 'India' ? 'Select State' : 'Select Province'}</option>
                  {getProvinces().map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <MapPin size={20} className="input-icon" />
                <input type="text" name="street" placeholder="Street / Area" value={formData.street} onChange={handleChange} autoComplete="off" />
              </div>
              <div className="input-group select-group">
                <MapPin size={20} className="input-icon" />
                <select name="country" value={formData.country} onChange={handleChange} className="country-select">
                  <option value="Nepal">🇳🇵 Nepal</option>
                  <option value="India">🇮🇳 India</option>
                </select>
              </div>
            </div>
          )}

          {isLogin && (
          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
            <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          )}

          {!isLogin && (
            <div className="pw-row">
              <div className="input-group">
                <Lock size={20} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <div className="input-group">
                <Lock size={20} className="input-icon" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  street: '',
                  city: '',
                  province: '',
                  country: 'Nepal',
                  countryCode: '+977',
                  phone: '',
                  gender: '',
                  dob: '',
                });
                setError('');
              }}
              className="toggle-btn"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
            position: fixed; /* Fixes it to the viewport */
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999; /* Ensures it is on top of everything */
            display: flex;
            align-items: flex-start;
            justify-content: center;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            margin: 0;
            padding: 1rem;
            overflow-y: auto;
            }
        .error-popup {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #bd4d4d;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          z-index: 10000;
          font-weight: 600;
          font-size: 0.9rem;
          text-align: center;
          max-width: 90%;
        }
        .login-card {
          background: white;
          padding: 1.25rem 1.5rem;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          margin: auto;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
        }
        .login-header { text-align: center; margin-bottom: 0.75rem; }
        .login-header h2 { font-size: 1.35rem; color: #1a1a1a; margin-bottom: 0.2rem; }
        .login-header p { color: #666; font-size: 0.85rem; }
        
        .input-group {
          position: relative;
          margin-bottom: 0.55rem;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }
        .input-group input {
          width: 100%;
          padding: 0.5rem 2.5rem 0.5rem 2.8rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .input-group input:focus { border-color: #F97316; }

        .eye-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        .eye-btn:hover { color: #666; }

        .submit-btn {
          width: 100%;
          padding: 0.75rem;
          background: #F97316;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.4rem;
          font-size: 0.95rem;
        }
        .submit-btn:disabled {
          background: #fdba74;
          cursor: not-allowed;
        }
        .login-footer { text-align: center; margin-top: 0.75rem; color: #666; font-size: 0.9rem; }
        .toggle-btn {
          background: none;
          border: none;
          color: #F97316;
          font-weight: 700;
          cursor: pointer;
          margin-left: 0.5rem;
        }

        .name-row, .pw-row {
          display: flex;
          gap: 0.75rem;
        }
        .name-row .input-group, .pw-row .input-group {
          flex: 1;
          min-width: 0;
        }

        .address-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
          margin-bottom: 0.55rem;
        }
        .address-grid .input-group {
          margin-bottom: 0;
        }
        
        .country-code {
          position: absolute;
          left: 36px;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          font-size: 0.82rem;
          font-weight: 500;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
        }

        .country-code-toggle {
          position: absolute;
          left: 36px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border: 1px solid #fed7aa;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
          z-index: 1;
        }

        .country-code-toggle:hover {
          background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.2);
        }

        .country-code-toggle .flag {
          font-size: 0.9rem;
        }

        .country-code-toggle .code {
          font-size: 0.8rem;
          font-weight: 600;
          color: #c2410c;
        }

        .country-code-toggle .toggle-indicator {
          font-size: 0.7rem;
          color: #f97316;
          margin-left: 2px;
        }

        .phone-group .phone-input {
          padding-left: 8.5rem !important;
        }

        .phone-input {
          padding-left: 5.8rem !important;
        }

        .select-group select {
          width: 100%;
          padding: 0.5rem 2.5rem 0.5rem 2.8rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          background: #fff;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        .select-group select:focus {
          border-color: #F97316;
        }

        .select-group::after {
          content: '▼';
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.65rem;
          color: #999;
          pointer-events: none;
        }

        .province-select, .country-select {
          color: #333;
        }

        .province-select option, .country-select option {
          padding: 8px;
        }

        .gender-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          margin-bottom: 0.55rem;
        }
        
        .gender-label {
          font-size: 0.85rem;
          color: #666;
          font-weight: 500;
          margin-left: 4px;
        }

        .gender-options {
          display: flex;
          gap: 1.2rem;
          padding-left: 4px;
        }

        .gender-options label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.9rem;
          color: #333;
          cursor: pointer;
        }

        .gender-options input[type="radio"] {
          accent-color: #F97316;
          width: auto;
          margin: 0;
        }

        .role-group {
          display: none;
        }

        @media (max-width: 480px) {
          .name-row, .pw-row, .address-grid {
            grid-template-columns: 1fr;
            flex-direction: column;
            gap: 0;
          }
        }
      `}</style>
    </div>
  );
}
