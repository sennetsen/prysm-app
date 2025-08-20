// Screen breakpoints (match your CSS breakpoints)
export const SCREEN_SIZES = {
  MOBILE: 'mobile',   // <= 480px
  TABLET: 'tablet',   // 481px - 768px
  DESKTOP: 'desktop'  // > 768px
};

// Get current screen size
export function getCurrentScreenSize() {
  const width = window.innerWidth;
  
  if (width <= 480) {
    return SCREEN_SIZES.MOBILE;
  } else if (width <= 768) {
    return SCREEN_SIZES.TABLET;
  } else {
    return SCREEN_SIZES.DESKTOP;
  }
}

// Load screen-specific JavaScript
export function loadScreenScript() {
  const currentSize = getCurrentScreenSize();
  
  // Dynamically import the appropriate screen file
  return import(`../screens/${currentSize}.js`)
    .then(module => {
      // Call the initialize function from the imported module
      if (module.initialize) {
        module.initialize();
      }
      return module;
    })
    .catch(error => {
      console.error(`Failed to load script for screen size: ${currentSize}`, error);
    });
} 