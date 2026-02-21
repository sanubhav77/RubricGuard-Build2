import React from 'react';
import { ValidationStatus } from '../types';

interface BadgeProps {
  status: ValidationStatus | 'info';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  let colorStyles = '';

  switch (status) {
    case ValidationStatus.Supported:
      colorStyles = 'bg-success-100 text-success';
      break;
    case ValidationStatus.Partial:
      colorStyles = 'bg-warning-100 text-warning';
      break;
    case ValidationStatus.NotSupported:
      colorStyles = 'bg-danger-100 text-danger';
      break;
    case ValidationStatus.NotAnalyzed:
      colorStyles = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      break;
    case ValidationStatus.Error:
      colorStyles = 'bg-danger-100 text-danger';
      break;
    case 'info':
      colorStyles = 'bg-blue-100 text-primary';
      break;
    default:
      colorStyles = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  return (
    <span className={`${baseStyles} ${colorStyles} ${className}`}>
      {status === ValidationStatus.Error ? 'Error' : status}
    </span>
  );
};

export default Badge;