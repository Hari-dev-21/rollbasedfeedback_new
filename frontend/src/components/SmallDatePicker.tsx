import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface SmallDatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  id?: string;
  required?: boolean;
}

const SmallDatePicker: React.FC<SmallDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Optional",
  className = "",
  label,
  id,
  required = false
}) => {
  const [showQuick, setShowQuick] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuick(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input value when prop value changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setInputValue(date.toISOString().slice(0, 16));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue || null);
  };

  const handleClear = () => {
    setInputValue('');
    onChange(null);
    setShowQuick(false);
  };

  const handleQuickSelect = (hours: number) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const isoString = futureDate.toISOString().slice(0, 16);
    setInputValue(isoString);
    onChange(isoString);
    setShowQuick(false);
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffHours < 24 * 7) {
      return `${Math.round(diffHours / 24)}d`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="flex items-center space-x-1">
        {/* Main datetime input - made smaller */}
        <input
          type="datetime-local"
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          className={`
            flex-1 px-2 py-1 border border-gray-300 rounded text-xs
            focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500
            ${className}
          `}
          style={{ 
            fontSize: '11px',
            minWidth: '140px',
            height: '28px'
          }}
        />
        
        {/* Quick select button */}
        <button
          type="button"
          onClick={() => setShowQuick(!showQuick)}
          className="p-1 border border-gray-300 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          title="Quick select"
          style={{ height: '28px', width: '28px' }}
        >
          <ClockIcon className="h-3 w-3" />
        </button>
        
        {/* Clear button */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 border border-gray-300 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            title="Clear"
            style={{ height: '28px', width: '28px' }}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Show short format below input */}
      {inputValue && (
        <div className="text-xs text-gray-500 mt-1">
          Expires in {formatShortDate(inputValue)}
        </div>
      )}

      {/* Compact quick select dropdown */}
      {showQuick && (
        <div className="absolute z-50 mt-1 w-36 bg-white shadow-md rounded border border-gray-200 py-1">
          <div className="px-2 py-1">
            <div className="text-xs font-medium text-gray-600 mb-1">Quick Set</div>
            {[
              { label: '1 hour', hours: 1 },
              { label: '1 day', hours: 24 },
              { label: '1 week', hours: 24 * 7 },
              { label: '1 month', hours: 24 * 30 },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickSelect(option.hours)}
                className="block w-full text-left px-1 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmallDatePicker;
