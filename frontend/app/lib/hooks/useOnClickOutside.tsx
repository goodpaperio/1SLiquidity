import { useEffect } from 'react';

type UseOnClickOutside = (
  ref: React.RefObject<HTMLElement>,
  handler: () => void
) => void;

const useOnClickOutside: UseOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (
      event: MouseEvent | TouchEvent | FocusEvent
    ) => {
      // Check if the focused element is outside the ref
      if (
        !ref.current ||
        (!ref.current.contains(event.target as Node) &&
          ref.current !== event.target)
      ) {
        handler();
      }
    };

    // Listen for mouse and touch events as before
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    // Add a focusin event listener to handle focus changes within the document
    document.addEventListener('focusin', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
      document.removeEventListener('focusin', listener);
    };
  }, [ref, handler]);
};

export default useOnClickOutside;
