// Simple fix for the overlay issue
document.addEventListener('DOMContentLoaded', function() {
  // Target all add-bookmark-card elements
  const addButtons = document.querySelectorAll('.add-bookmark-card');
  
  // Remove all inline z-index styles
  addButtons.forEach(button => {
    if (button.style.zIndex) {
      button.style.removeProperty('zIndex');
    }
  });
  
  // Ensure modal has proper z-index
  const modal = document.getElementById('bookmark-modal');
  if (modal) {
    modal.style.zIndex = '1000';
  }
  
  // Add observer to fix any dynamically added bookmark cards
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(function(node) {
          if (node.classList && 
              (node.classList.contains('bookmark-card') || 
               node.classList.contains('add-bookmark-card'))) {
            if (node.style.zIndex) {
              node.style.removeProperty('zIndex');
            }
          }
        });
      }
    });
  });
  
  // Start observing the DOM for changes
  observer.observe(document.getElementById('bookmarks-wrapper'), { 
    childList: true,
    subtree: true
  });
});
