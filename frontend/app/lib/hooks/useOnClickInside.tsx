import { RefObject, useEffect } from 'react';

function useOnClickInside(
  containerRef: RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Trigger handler if the event target is not within the containerRef
      if (
        containerRef?.current &&
        !containerRef?.current.contains(event.target as Node)
      ) {
        handler(event);
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, containerRef]); // Dependencies array includes handler and containerRef
}

export default useOnClickInside;
