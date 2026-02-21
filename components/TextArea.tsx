import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  charLimit?: number;
}

const TextArea: React.FC<TextAreaProps> = ({ label, charLimit, value, className = '', ...props }) => {
  const currentLength = typeof value === 'string' ? value.length : 0;
  const isOverLimit = charLimit !== undefined && currentLength > charLimit;

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        {label}
      </label>
      <textarea
        className={`block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900 dark:text-gray-100 ${isOverLimit ? 'border-danger focus:border-danger focus:ring-danger' : ''}`}
        rows={4}
        {...props}
        value={value}
      ></textarea>
      {charLimit !== undefined && (
        <p className={`mt-1 text-xs text-right ${isOverLimit ? 'text-danger' : 'text-gray-500 dark:text-gray-400'}`}>
          {currentLength}/{charLimit}
        </p>
      )}
    </div>
  );
};

export default TextArea;