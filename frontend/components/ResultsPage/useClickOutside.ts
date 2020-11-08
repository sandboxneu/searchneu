import { useEffect } from 'react';

/**
 * Hook for closing components when clicked outside
 * @param ref ref for the component to close
 * @param flag boolean representing the open state of the component
 * @param setFlag function to set the open state of the component
 */

export default function useClickOutside(ref: React.RefObject<HTMLElement>, flag: boolean, setFlag: (b: boolean) => void) {
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current.contains(e.target)) {
        return;
      }
      setFlag(false);
    }

    if (flag) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [flag, ref, setFlag]);
}
