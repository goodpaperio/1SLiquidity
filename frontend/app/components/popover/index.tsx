import React, { ReactNode, useEffect, useRef, useState } from 'react';

type PopoverProps = {
  children: ReactNode;
  content: ReactNode;
  error?: boolean;
};

const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  error,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show popover
  const handleMouseEnter = () => setIsOpen(true);

  // Hide popover
  const handleMouseLeave = () => setIsOpen(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      // Only add this listener if the popover is open
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); // Depend on isOpen so we only add/remove listeners when necessary

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseLeave={handleMouseLeave}
    >
      <div
        onMouseEnter={handleMouseEnter}
        className="cursor-pointer flex items-center justify-center"
      >
        {children}
      </div>
      {isOpen && (
        <div
          className={`absolute z-10 w-fit max-w-64 p-2 mt-2 bg-black border rounded shadow-lg ${
            error ? 'border-error text-primaryRed' : 'border-primary'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Popover;
