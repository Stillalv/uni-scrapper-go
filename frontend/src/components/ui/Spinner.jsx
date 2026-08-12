import React from 'react';

export default function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-3.5 h-3.5 border-2',
    md: 'w-4 h-4 border-2',
    lg: 'w-6 h-6 border-3',
  };

  return (
    <div
      className={`inline-block rounded-full border-solid border-current border-r-transparent animate-spin ${sizeMap[size] || sizeMap.md} ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
