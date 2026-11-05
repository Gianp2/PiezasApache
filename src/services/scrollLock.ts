import { useEffect } from 'react';

/**
 * Universal scroll lock manager with reference counting.
 * Supports iOS Safari, Android Chrome, and Desktop browsers.
 * Preserves scroll position and prevents layout shift by compensating for scrollbar width.
 */

let lockCount = 0;
let savedScrollY = 0;
let originalStyles: {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
  overscrollBehavior: string;
} | null = null;

export function acquireScrollLock(): void {
  if (typeof document === 'undefined') return;

  lockCount++;

  if (lockCount === 1) {
    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const body = document.body;

    originalStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      overscrollBehavior: body.style.overscrollBehavior
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
}

export function releaseScrollLock(): void {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0 && originalStyles) {
    const body = document.body;

    body.style.overflow = originalStyles.overflow;
    body.style.position = originalStyles.position;
    body.style.top = originalStyles.top;
    body.style.left = originalStyles.left;
    body.style.right = originalStyles.right;
    body.style.width = originalStyles.width;
    body.style.paddingRight = originalStyles.paddingRight;
    body.style.overscrollBehavior = originalStyles.overscrollBehavior;

    originalStyles = null;

    // Restore previous scroll position without visual jitter
    window.scrollTo({
      top: savedScrollY,
      left: 0,
      behavior: 'instant' as ScrollBehavior
    });
  }
}

/**
 * React hook to lock document body scroll when an overlay/modal is open.
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    acquireScrollLock();

    return () => {
      releaseScrollLock();
    };
  }, [isLocked]);
}
