import React, { useState, FormEvent, ChangeEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface FormData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

const RegisterPage = () => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    // Validation
    const { username, email, password, first_name, last_name } = formData;
    
    if (!username.trim()) {
      setError("Username is required");
      setIsLoading(false);
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      setIsLoading(false);
      return;
    }
    if (!first_name.trim()) {
      setError("First name is required");
      setIsLoading(false);
      return;
    }
    if (!last_name.trim()) {
      setError("Last name is required");
      setIsLoading(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/auth/register/", {
        username: username.trim(),
        email: email.trim(),
        password: password,
        first_name: first_name.trim(),
        last_name: last_name.trim()
      });

      setMessage("Registration successful! Redirecting to login...");

      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: ''
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);

    } catch (err: unknown) {
      console.error("Registration error:", err);

      // Type guard to check if it's an Axios error
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data;
        
        // Check for username already exists error
        if (errorData.username && Array.isArray(errorData.username) && 
            errorData.username.includes('A user with that username already exists.')) {
          setError("Username already exists. Redirecting to login...");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 2000);
        } 
        // Check for email already exists error
        else if (errorData.email && Array.isArray(errorData.email) && 
                 errorData.email.includes('A user with that email already exists.')) {
          setError("Email already exists. Redirecting to login...");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 2000);
        }
        // Handle other validation errors
        else {
          const errors = Object.entries(errorData)
            .map(([field, msgs]) => {
              if (Array.isArray(msgs)) {
                return `${field}: ${msgs.join(', ')}`;
              }
              return `${field}: ${msgs}`;
            })
            .join('\n');
          setError(errors);
        }
      } else if (axios.isAxiosError(err) && err.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded whitespace-pre-wrap">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
              placeholder="Enter your username"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
              placeholder="Enter your email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </div>

          {/* First Name and Last Name in a row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
                placeholder="Last name"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a 
            href="/login" 
            className="text-blue-600 hover:text-blue-800 font-medium"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              navigate("/login");
            }}
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;