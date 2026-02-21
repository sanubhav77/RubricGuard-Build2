import React from 'react';

interface DropdownProps<T> extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: T[];
  label: string;
  valueKey: keyof T;
  displayKey: keyof T;
  placeholder?: string;
  className?: string; // Added className to props
  id?: string; // Added id to props
  // Fix: Explicitly add 'value' to DropdownProps for better type inference with generic components
  value?: string | number | readonly string[];
}

const Dropdown = <T,>({
  options,
  label,
  valueKey,
  displayKey,
  placeholder,
  className = '',
  id, // Destructure id
  ...props
}: DropdownProps<T>): React.ReactElement => {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        {label}
      </label>
      <select
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900 dark:text-gray-100"
        id={id} // Assign id to the select element
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={String(option[valueKey])} value={String(option[valueKey])}>
            {String(option[displayKey])}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;