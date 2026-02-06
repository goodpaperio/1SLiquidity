import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Drawer: React.FC<Props> = ({ open, onClose, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Drawer container */}
      <div className="relative flex flex-col bg-black w-64 h-full shadow-xl transition-transform transform -translate-x-0">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-md text-gray-600 hover:text-gray-900"
          aria-label="Close"
        >
          {/* Assuming you have an SVG icon or similar for closing */}
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
        {/* Content area */}
        <div className="flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
