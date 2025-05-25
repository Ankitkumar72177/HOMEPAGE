// Inline fix for pagination issue in renderBookmarks
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const addBookmarkBtn = document.getElementById('add-bookmark');
    const bookmarkModal = document.getElementById('bookmark-modal');
    const closeBtns = document.querySelectorAll('.close');
    const bookmarkForm = document.getElementById('bookmark-form');
    const bookmarksWrapper = document.getElementById('bookmarks-wrapper');
    const paginationDots = document.getElementById('pagination-dots');
    const auroraBackground = document.querySelector('.aurora-gradient');
    const header = document.querySelector('header');
    
    // Track if we're in edit mode and store the current bookmark ID being edited
    let isEditMode = false;
    let currentEditId = null;
    
    // Constants
    const BOOKMARKS_PER_PAGE = 10; // Changed to 10 bookmarks per page
    
    // Current page index
    let currentPage = 0;
    
    // Store the currently dragged bookmark element
    let draggedItem = null;
    
    // Load bookmarks from local storage
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    
    // Initialize the app
    init();
    
    function init() {
        renderBookmarks();
        setupEventListeners();
        
        // Add touch events for mobile swipe
        setupSwipeEvents();
        
        // Add direct event listener to close button - guaranteed to work
        document.getElementById('close-bookmark-modal').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
            return false;
        };
        
        // Make sure the current page is displayed correctly at startup
        setTimeout(() => {
            updatePageDisplay();
        }, 100);
    }
    
    function setupEventListeners() {
        // Open modal when clicking Add button
        addBookmarkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isEditMode = false; // Ensure we're not in edit mode
            currentEditId = null;
            openModal();
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === bookmarkModal) {
                closeModal();
            }
        });
        
        // Close button handler
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
        });
        
        // Global event listener for close button clicks
        document.addEventListener('click', (e) => {
            if (e.target.id === 'close-bookmark-modal' || e.target.closest('#close-bookmark-modal')) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            }
            
            // Close all dropdown menus when clicking elsewhere
            if (!e.target.closest('.menu-button') && !e.target.closest('.dropdown-menu')) {
                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        }, true); // Use capture phase
        
        // Add 'escape' key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && bookmarkModal.style.display === 'block') {
                closeModal();
            }
        });
        
        // Submit form
        bookmarkForm.addEventListener('submit', handleBookmarkFormSubmit);
        
        // Add drag and drop event listeners to the bookmarks wrapper
        setupDragAndDrop();
    }
    
    function setupDragAndDrop() {
        // Event delegation for drag events on bookmark cards
        bookmarksWrapper.addEventListener('dragstart', handleDragStart);
        bookmarksWrapper.addEventListener('dragover', handleDragOver);
        bookmarksWrapper.addEventListener('dragleave', handleDragLeave);
        bookmarksWrapper.addEventListener('drop', handleDrop);
        bookmarksWrapper.addEventListener('dragend', handleDragEnd);
    }
    
    function openModal() {
        // Reset form fields when opening for a new bookmark (not editing)
        if (!isEditMode) {
            document.getElementById('website-url').value = '';
            document.getElementById('website-name').value = '';
        }
        
        // Display the modal
        bookmarkModal.style.display = 'block';
        
        // Remove any lingering overlays
        const existingOverlays = document.querySelectorAll('.add-bookmark-overlay');
        existingOverlays.forEach(overlay => {
            document.body.removeChild(overlay);
        });
        
        // Change modal title based on mode
        const modalTitle = bookmarkModal.querySelector('h2');
        modalTitle.textContent = isEditMode ? 'Edit Bookmark' : 'Add New Bookmark';
        
        // Change submit button text
        const submitBtn = bookmarkForm.querySelector('.submit-btn');
        submitBtn.textContent = isEditMode ? 'Update Bookmark' : 'Save Bookmark';
        
        // Focus on different fields based on mode
        if (isEditMode) {
            // When editing, focus on name field after a short delay
            setTimeout(() => {
                document.getElementById('website-name').focus();
            }, 50);
        } else {
            // When adding new, focus on URL field
            setTimeout(() => {
                document.getElementById('website-url').focus();
            }, 50);
        }
    }
    
    function closeModal() {
        // Hide the modal
        bookmarkModal.style.display = 'none';
        
        // Reset edit mode and current edit ID
        isEditMode = false;
        currentEditId = null;
        
        // Delay resetting the form to ensure form submission completes
        setTimeout(() => {
            // Reset the form
            bookmarkForm.reset();
            
            // Reset edit mode
            isEditMode = false;
            currentEditId = null;
            
            // Reset modal title and button to default
            const modalTitle = bookmarkModal.querySelector('h2');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Bookmark';
            }
            
            const submitBtn = bookmarkForm.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.textContent = 'Save Bookmark';
            }
        }, 200);
    }
    
    function handleBookmarkFormSubmit(e) {
        e.preventDefault();
        
        const urlInput = document.getElementById('website-url');
        const nameInput = document.getElementById('website-name');
        
        let url = urlInput.value.trim();
        let customName = nameInput.value.trim();
        
        // Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        try {
            new URL(url);
        } catch (e) {
            alert('Please enter a valid URL');
            return;
        }
        
        if (isEditMode && currentEditId !== null) {
            // Call separate function for updating bookmark
            updateBookmark(currentEditId, url, customName);
        } else {
            // Create new bookmark
            const name = customName || extractWebsiteName(url);
            const newBookmark = {
                id: Date.now(),
                url: url,
                name: name,
                favicon: getFaviconUrl(url)
            };
            
            // Add to bookmarks array
            bookmarks.push(newBookmark);
            
            // Save to local storage
            saveBookmarks();
            
            // Store the current page to preserve it after re-rendering
            const previousPage = currentPage;
            
            // Re-render bookmarks
            renderBookmarks();
            
            // Calculate total pages to ensure current page is still valid
            const totalBookmarks = bookmarks.length;
            const regularPages = Math.ceil(totalBookmarks / BOOKMARKS_PER_PAGE);
            let totalPages = regularPages;
            if (totalBookmarks > 0 && totalBookmarks % BOOKMARKS_PER_PAGE === 0) {
                totalPages++;
            }
            
            // Restore the previous page if it's still valid, otherwise go to last valid page
            if (previousPage < totalPages) {
                currentPage = previousPage;
            } else {
                currentPage = Math.max(0, totalPages - 1);
            }
        }
        
        // Close modal
        closeModal();
        
        // Force update of page display
        setTimeout(() => {
            updatePageDisplay();
        }, 0);
    }
    
    // New function specifically for updating bookmarks
    function updateBookmark(id, url, customName) {
        // Find the bookmark in the array
        const bookmarkIndex = bookmarks.findIndex(b => b.id === id);
        if (bookmarkIndex === -1) return false;
        
        // Get the name - use custom name if provided, otherwise extract from URL
        const name = customName || extractWebsiteName(url);
        
        // Update the bookmark - create a new object to ensure proper state update
        bookmarks[bookmarkIndex] = {
            ...bookmarks[bookmarkIndex],
            url: url,
            name: name,
            favicon: getFaviconUrl(url)
        };
        
        alert(`Bookmark renamed to: ${name}`);
        
        // Save to local storage
        saveBookmarks();
        
        // Re-render bookmarks to reflect changes
        renderBookmarks();
        
        // Reset edit mode
        isEditMode = false;
        currentEditId = null;
        
        return true;
    }
    
    function extractWebsiteName(url) {
        try {
            const urlObj = new URL(url);
            let hostname = urlObj.hostname;
            
            // Remove www. if present
            hostname = hostname.replace(/^www\./, '');
            
            // Extract the main domain name (remove .com, .org, etc)
            const parts = hostname.split('.');
            if (parts.length >= 2) {
                // Return just the domain name (e.g., 'google' from 'google.com')
                return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
            }
            
            return hostname;
        } catch (e) {
            // If something goes wrong, just return a portion of the URL
            return truncateText(url, 10);
        }
    }
    
    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    function getFaviconUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            // Special cases for known domains to match the screenshot
            if (domain.includes('google.com')) {
                return 'https://www.google.com/favicon.ico';
            } else if (domain.includes('x.com') || domain.includes('twitter.com')) {
                return 'https://abs.twimg.com/favicons/twitter.2.ico';
            } else {
                // Use high quality favicon with size=128 for better display
                // Add a cache-busting parameter to ensure we get the latest version
                return `https://www.google.com/s2/favicons?domain=${domain}&sz=128&t=${Date.now()}`;
            }
        } catch (e) {
            // Fallback favicon
            return 'https://via.placeholder.com/64?text=?';
        }
    }
    
    function saveBookmarks() {
        try {
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            console.log('Bookmarks saved to localStorage:', bookmarks);
            
            // Verify the save by reading it back
            const savedBookmarks = JSON.parse(localStorage.getItem('bookmarks'));
            console.log('Verified saved bookmarks:', savedBookmarks);
        } catch (error) {
            console.error('Error saving bookmarks:', error);
        }
    }
    
    function renderBookmarks() {
        // Clear the current display
        bookmarksWrapper.innerHTML = '';
        
        // Calculate total pages based on bookmarks count
        const totalBookmarks = bookmarks.length;
        
        // Determine how many actual pages we need for the existing bookmarks
        let pagesNeeded = Math.max(1, Math.ceil(totalBookmarks / BOOKMARKS_PER_PAGE));
        
        // Check if the last page has room for the Add button or if we need an extra page
        const lastPageItemCount = totalBookmarks % BOOKMARKS_PER_PAGE;
        const lastPageIsFull = lastPageItemCount === 0 && totalBookmarks > 0;
        
        // If the last page is full and we have bookmarks, we'll need an extra page for the Add button
        const needExtraPage = lastPageIsFull;
        
        // Log information for debugging
        console.log('Bookmarks count:', totalBookmarks);
        console.log('Pages needed for bookmarks:', pagesNeeded);
        console.log('Last page item count:', lastPageItemCount);
        console.log('Last page is full:', lastPageIsFull);
        console.log('Need extra page:', needExtraPage);
        
        // Create a div for each page of actual bookmarks
        for (let i = 0; i < pagesNeeded; i++) {
            const pageStart = i * BOOKMARKS_PER_PAGE;
            const pageEnd = Math.min(pageStart + BOOKMARKS_PER_PAGE, totalBookmarks);
            const pageBookmarks = bookmarks.slice(pageStart, pageEnd);
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'bookmark-page';
            pageDiv.id = `page-${i}`;
            
            // Add bookmarks to this page
            pageBookmarks.forEach(bookmark => {
                const bookmarkCard = createBookmarkElement(bookmark);
                pageDiv.appendChild(bookmarkCard);
            });
            
            // Add the "Add Bookmark" button if there's room on this page
            // or if it's the last page and there are no bookmarks yet
            const isLastPage = (i === pagesNeeded - 1);
            const hasRoomForButton = pageBookmarks.length < BOOKMARKS_PER_PAGE;
            
            if (hasRoomForButton || (totalBookmarks === 0 && i === 0)) {
                const addButton = createAddBookmarkButton();
                // Ensure the Add button is added as a separate grid item
                addButton.style.gridColumn = "auto"; // Let grid handle placement
                addButton.style.position = "relative"; // Ensure proper stacking
                pageDiv.appendChild(addButton);
            }
            
            bookmarksWrapper.appendChild(pageDiv);
        }
        
        // Only create an extra page with just the Add button if the last page is full
        if (needExtraPage) {
            const emptyPageDiv = document.createElement('div');
            emptyPageDiv.className = 'bookmark-page';
            emptyPageDiv.id = `page-${pagesNeeded}`;
            
            const addButton = createAddBookmarkButton();
            emptyPageDiv.appendChild(addButton);
            
            bookmarksWrapper.appendChild(emptyPageDiv);
            
            // Update pagesNeeded to include this extra page
            pagesNeeded += 1;
            
            console.log('Added extra page. Total pages:', pagesNeeded);
        }
        
        // Make sure each page has an Add button
        document.querySelectorAll('.bookmark-page').forEach((page, index) => {
            // Check if this page already has an add button
            if (!page.querySelector('.add-bookmark-card')) {
                const startIndex = index * BOOKMARKS_PER_PAGE;
                const endIndex = Math.min(startIndex + BOOKMARKS_PER_PAGE, totalBookmarks);
                const bookmarksOnPage = endIndex - startIndex;
                
                // If there's room for an add button, add it
                if (bookmarksOnPage < BOOKMARKS_PER_PAGE) {
                    const addButton = createAddBookmarkButton();
                    page.appendChild(addButton);
                }
            }
        });
        
        // Calculate the actual number of pages needed for display purposes
        // This is the number of DOM elements with class 'bookmark-page'
        const actualPagesCount = document.querySelectorAll('.bookmark-page').length;
        console.log('Actual pages in DOM:', actualPagesCount);
        
        // FIX: Only show pagination if we have more than one page
        if (actualPagesCount <= 1) {
            // Clear pagination dots if we only have one page
            paginationDots.innerHTML = '';
            document.querySelector('.pagination').style.display = 'none';
            
            // Hide swipe hint for single page
            document.querySelector('.swipe-hint').style.display = 'none';
            
            console.log('Hiding pagination - only one page needed');
        } else {
            // We need multiple pages, show pagination dots
            renderPaginationDots(actualPagesCount);
            document.querySelector('.pagination').style.display = 'flex';
            
            // Show swipe hint for multiple pages
            document.querySelector('.swipe-hint').style.display = 'block';
            
            console.log('Showing pagination for', actualPagesCount, 'pages');
        }
        
        // Update page display
        updatePageDisplay();
    }
    
    function createBookmarkElement(bookmark) {
        const bookmarkCard = document.createElement('div');
        bookmarkCard.className = 'bookmark-card';
        bookmarkCard.dataset.id = bookmark.id;
        
        // Make the card draggable
        bookmarkCard.setAttribute('draggable', 'true');
        
        // Make sure bookmark has a valid name
        if (!bookmark.name && bookmark.url) {
            bookmark.name = extractWebsiteName(bookmark.url);
            saveBookmarks();
        }
        
        // Ensure name is not too long for display
        const displayName = truncateText(bookmark.name || extractWebsiteName(bookmark.url), 10);
        
        // Ensure we have a valid favicon URL with high quality
        let faviconUrl;
        try {
            const urlObj = new URL(bookmark.url);
            faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
        } catch (e) {
            faviconUrl = bookmark.favicon || 'https://via.placeholder.com/64?text=' + displayName.charAt(0);
        }
        
        bookmarkCard.innerHTML = `
            <div class="menu-container">
                <button class="menu-button" title="Options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu">
                    <button class="menu-item edit-bookmark">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="menu-item delete-bookmark">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            <img src="${faviconUrl}" alt="${displayName}" class="bookmark-logo" onerror="this.src='https://via.placeholder.com/64?text=${displayName.charAt(0)}'">
            <div class="bookmark-title">${displayName}</div>
            <div class="bookmark-url">${new URL(bookmark.url).hostname}</div>
        `;
        
        // Add menu toggle functionality
        const menuButton = bookmarkCard.querySelector('.menu-button');
        const dropdownMenu = bookmarkCard.querySelector('.dropdown-menu');
        
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other open menus first
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                if (menu !== dropdownMenu) menu.classList.remove('show');
            });
            dropdownMenu.classList.toggle('show');
        });
        
        // Add delete functionality
        const deleteBtn = bookmarkCard.querySelector('.delete-bookmark');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBookmark(bookmark.id);
        });
        
        // Add edit functionality
        const editBtn = bookmarkCard.querySelector('.edit-bookmark');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editBookmark(bookmark.id);
        });
        
        // Add click event to open the bookmark URL (only when not clicking menu items)
        bookmarkCard.addEventListener('click', (e) => {
            // Don't open URL if clicking on delete button or edit button or menu
            if (e.target.closest('.menu-container')) {
                return;
            }
            window.open(bookmark.url, '_blank');
        });
        
        return bookmarkCard;
    }
    
    function deleteBookmark(id) {
        if (confirm('Are you sure you want to delete this bookmark?')) {
            // Remove the bookmark from the array
            bookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
            
            // Save to local storage
            saveBookmarks();
            
            // Re-render bookmarks
            renderBookmarks();
            
            // Adjust current page if necessary
            const totalPages = Math.max(1, Math.ceil(bookmarks.length / BOOKMARKS_PER_PAGE));
            if (currentPage >= totalPages) {
                currentPage = Math.max(0, totalPages - 1);
            }
            updatePageDisplay();
        }
    }
    
    function editBookmark(id) {
        // Find the bookmark in the array
        const bookmark = bookmarks.find(b => b.id === id);
        if (!bookmark) {
            alert("Could not find bookmark to edit");
            return;
        }
        
        // Store the original page index for this bookmark
        const bookmarkIndex = bookmarks.findIndex(b => b.id === id);
        const originalPageIndex = Math.floor(bookmarkIndex / BOOKMARKS_PER_PAGE);
        
        // Set edit mode
        isEditMode = true;
        currentEditId = id;
        
        // Populate the form with the bookmark's current values
        document.getElementById('website-url').value = bookmark.url || '';
        document.getElementById('website-name').value = bookmark.name || '';
        
        // Open modal
        bookmarkModal.style.display = 'block';
        
        // Focus on the name field for easier editing
        setTimeout(() => {
            const nameField = document.getElementById('website-name');
            nameField.focus();
            nameField.select();
        }, 100);
        
        // Ensure modal shows correct title and button
        const modalTitle = bookmarkModal.querySelector('h2');
        modalTitle.textContent = 'Edit Bookmark';
        
        const submitBtn = bookmarkForm.querySelector('.submit-btn');
        submitBtn.textContent = 'Update Bookmark';
        
        // Close any open menus
        const dropdownMenus = document.querySelectorAll('.dropdown-menu.show');
        dropdownMenus.forEach(menu => menu.classList.remove('show'));
    }
    
    function createAddBookmarkButton() {
        const addButtonCard = document.createElement('div');
        addButtonCard.className = 'bookmark-card add-bookmark-card';
        
        addButtonCard.innerHTML = `
            <i class="fas fa-plus" style="font-size: 32px; color: white; margin-bottom: 10px;"></i>
            <div class="bookmark-title">Add</div>
        `;
        
        // Add click event to open add bookmark modal
        addButtonCard.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isEditMode = false;
            currentEditId = null;
            openModal();
        });
        
        return addButtonCard;
    }
    
    function renderPaginationDots(pagesCount) {
        // Clear all existing pagination dots
        paginationDots.innerHTML = '';
        
        // Safety check - only create dots if we actually have multiple pages
        if (pagesCount <= 1) {
            console.log('No pagination dots needed, only one page');
            return;
        }
        
        // Log page info for debugging
        console.log('Creating pagination dots for', pagesCount, 'pages');
        console.log('Current page:', currentPage);
        
        // Create the dots
        for (let i = 0; i < pagesCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'pagination-dot';
            if (i === currentPage) {
                dot.classList.add('active');
            }
            dot.dataset.page = i;
            
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Update the current page
                currentPage = i;
                
                // Update the page display
                updatePageDisplay();
                
                // Ensure smooth scrolling to the clicked page
                bookmarksWrapper.style.transition = 'transform 0.3s ease-in-out';
                setTimeout(() => {
                    bookmarksWrapper.style.transition = '';
                }, 300);
            });
            
            paginationDots.appendChild(dot);
        }
    }
    
    function updatePageDisplay() {
        // Calculate total pages including any empty page with just an Add button
        const totalBookmarks = bookmarks.length;
        const regularPages = Math.ceil(totalBookmarks / BOOKMARKS_PER_PAGE);
        
        // Only add an extra page if the last page is completely full AND we have bookmarks
        let totalPages = regularPages;
        if (totalBookmarks > 0 && totalBookmarks % BOOKMARKS_PER_PAGE === 0) {
            totalPages++;
        }
        
        // Make sure currentPage is valid
        if (currentPage >= totalPages) {
            currentPage = Math.max(0, totalPages - 1);
        }
        
        // Update wrapper transform to show current page
        bookmarksWrapper.style.transform = `translateX(-${currentPage * 100}%)`;
        
        // Update active pagination dot
        const dots = document.querySelectorAll('.pagination-dot');
        dots.forEach((dot, index) => {
            if (index === currentPage) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        
        // Show/hide swipe hint based on bookmarks count and total pages
        const swipeHint = document.querySelector('.swipe-hint');
        if (totalPages > 1) {
            swipeHint.style.display = 'block';
        } else {
            swipeHint.style.display = 'none';
        }
        
        // Ensure the current page is reflected in the UI
        showCurrentPage();
    }
    
    // Function to ensure the current page is properly displayed
    function showCurrentPage() {
        // Make sure all pages are visible for horizontal scrolling pagination
        document.querySelectorAll('.bookmark-page').forEach(page => {
            page.style.display = 'grid';
        });
        
        // Ensure the Add button is visible
        document.querySelectorAll('.add-bookmark-card').forEach(btn => {
            btn.style.display = 'flex';
        });
    }
    
    function setupSwipeEvents() {
        let touchStartX = 0;
        let touchEndX = 0;
        
        bookmarksWrapper.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        bookmarksWrapper.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
        
        function handleSwipe() {
            const swipeThreshold = 50;
            
            // Calculate total pages
            const totalBookmarks = bookmarks.length;
            const regularPages = Math.ceil(totalBookmarks / BOOKMARKS_PER_PAGE);
            
            // Only add an extra page if the last page is completely full AND we have bookmarks
            let totalPages = regularPages;
            if (totalBookmarks > 0 && totalBookmarks % BOOKMARKS_PER_PAGE === 0) {
                totalPages++;
            }
            
            // Don't allow swiping if there's only one page
            if (totalPages <= 1) {
                return;
            }
            
            // Left swipe (next page)
            if (touchStartX - touchEndX > swipeThreshold) {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    updatePageDisplay();
                }
            }
            
            // Right swipe (previous page)
            if (touchEndX - touchStartX > swipeThreshold) {
                if (currentPage > 0) {
                    currentPage--;
                    updatePageDisplay();
                }
            }
        }
    }
    
    // Drag and Drop Handlers
    function handleDragStart(e) {
        // Only handle drag events from bookmark cards
        if (!e.target.closest('.bookmark-card') || e.target.closest('.add-bookmark-card')) {
            return;
        }
        
        const bookmarkCard = e.target.closest('.bookmark-card');
        draggedItem = bookmarkCard;
        
        // Store the bookmark ID and page index for later use
        e.dataTransfer.setData('text/plain', bookmarkCard.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        
        // Add dragging class after a small delay to ensure the original item is visible during drag start
        setTimeout(() => {
            bookmarkCard.classList.add('dragging');
        }, 0);
    }
    
    function handleDragOver(e) {
        // Prevent default to allow drop
        e.preventDefault();
        
        const targetCard = e.target.closest('.bookmark-card');
        if (!targetCard || targetCard === draggedItem || targetCard.classList.contains('add-bookmark-card')) {
            return;
        }
        
        e.dataTransfer.dropEffect = 'move';
        
        // Add visual indicator for drop target
        const rect = targetCard.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        // Clear previous indicators
        clearDropIndicators();
        
        if (e.clientY < midY) {
            // Dropping above
            targetCard.classList.add('drop-above');
        } else {
            // Dropping below
            targetCard.classList.add('drop-below');
        }
    }
    
    function handleDragLeave(e) {
        // Remove drop indicators when leaving a potential drop target
        if (e.target.closest('.bookmark-card')) {
            clearDropIndicators();
        }
    }
    
    function clearDropIndicators() {
        document.querySelectorAll('.drop-above, .drop-below').forEach(card => {
            card.classList.remove('drop-above', 'drop-below');
        });
    }
    
    function handleDrop(e) {
        e.preventDefault();
        
        // Clear drop indicators
        clearDropIndicators();
        
        if (!draggedItem) return;
        
        const targetCard = e.target.closest('.bookmark-card');
        if (!targetCard || targetCard === draggedItem || targetCard.classList.contains('add-bookmark-card')) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            return;
        }
        
        // Get the IDs and find their indices in the bookmarks array
        const draggedId = parseInt(draggedItem.dataset.id);
        const targetId = parseInt(targetCard.dataset.id);
        
        const draggedIndex = bookmarks.findIndex(b => b.id === draggedId);
        const targetIndex = bookmarks.findIndex(b => b.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) {
            console.error('Could not find bookmark indices for drag and drop');
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            return;
        }
        
        // Get the bookmark to move
        const [movedBookmark] = bookmarks.splice(draggedIndex, 1);
        
        // Determine if we're dropping above or below the target
        const rect = targetCard.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        let newPosition = targetIndex;
        
        // If dragged from before target, adjust index
        if (draggedIndex < targetIndex) {
            newPosition--;
        }
        
        // Insert above or below based on drop position
        if (e.clientY > midY) {
            // Drop below target
            bookmarks.splice(newPosition + 1, 0, movedBookmark);
        } else {
            // Drop above target
            bookmarks.splice(newPosition, 0, movedBookmark);
        }
        
        // Save to local storage
        saveBookmarks();
        
        // Check if this is a cross-page drop (different page containers)
        const isCrossPageDrop = draggedItem.parentElement !== targetCard.parentElement;
        
        if (isCrossPageDrop) {
            // For cross-page drops, we need to re-render to maintain pagination integrity
            // Store the current page to preserve it after re-rendering
            const previousPage = currentPage;
            
            // Re-render bookmarks to reflect new order
            renderBookmarks();
            
            // Calculate total pages to ensure current page is still valid
            const totalBookmarks = bookmarks.length;
            const regularPages = Math.ceil(totalBookmarks / BOOKMARKS_PER_PAGE);
            let totalPages = regularPages;
            if (totalBookmarks > 0 && totalBookmarks % BOOKMARKS_PER_PAGE === 0) {
                totalPages++;
            }
            
            // Restore the previous page if it's still valid, otherwise go to last valid page
            if (previousPage < totalPages) {
                currentPage = previousPage;
            } else {
                currentPage = Math.max(0, totalPages - 1);
            }
            
            // Update page display to show the correct page
            setTimeout(() => {
                updatePageDisplay();
            }, 0);
        } else {
            // For same-page drops, use optimized DOM manipulation
            // This prevents other bookmarks from jumping around
            
            // Remove the dragged item from its current position
            draggedItem.remove();
            
            // Insert the dragged item at the new position
            if (e.clientY > midY) {
                // Insert after the target element
                targetCard.parentElement.insertBefore(draggedItem, targetCard.nextSibling);
            } else {
                // Insert before the target element
                targetCard.parentElement.insertBefore(draggedItem, targetCard);
            }
        }
        
        // Reset drag state
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }
    
    function handleDragEnd(e) {
        // Clean up any remaining drag state
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
        
        clearDropIndicators();
    }
});
