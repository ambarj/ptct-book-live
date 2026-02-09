// PTCT Book - Base JavaScript
// Handles navigation, routing, and core functionality

(function() {
    'use strict';

    // State
    const state = {
        currentSection: '01-visual-thinking-intro',
        pendingAnchor: null,  // Anchor to scroll to after section loads
        isMobile: window.innerWidth <= 768
    };

    // DOM Elements
    const elements = {
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        menuToggle: document.getElementById('menuToggle'),
        contentWrapper: document.getElementById('contentWrapper'),
        navSections: document.querySelectorAll('.nav-section'),
        navChapterTitles: document.querySelectorAll('.nav-chapter-title')
    };

    // Initialize
    function init() {
        setupEventListeners();
        setupChapterToggles();

        // Check URL hash first before loading default section
        // Format: #section-name or #section-name/anchor-id
        const hash = window.location.hash.substring(1);
        if (hash) {
            const [sectionId, anchor] = hash.split('/');
            const sectionExists = document.querySelector(`[data-section="${sectionId}"]`);
            if (sectionExists) {
                state.currentSection = sectionId;
                if (anchor) {
                    state.pendingAnchor = anchor;
                }
            }
        }

        // Clear any default active states first, then set correct one
        elements.navSections.forEach(s => s.classList.remove('active'));
        const activeNav = document.querySelector(`[data-section="${state.currentSection}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
            const parentChapter = activeNav.closest('.nav-chapter');
            if (parentChapter) {
                parentChapter.classList.add('expanded');
            }
        }

        loadSection(state.currentSection);
        updateResponsive();
    }

    // Event Listeners
    function setupEventListeners() {
        // Navigation click
        elements.navSections.forEach(section => {
            section.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                navigateToSection(sectionId);
            });
        });

        // Mobile menu toggle
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', toggleMobileMenu);
        }

        // Overlay click to close menu
        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.addEventListener('click', closeMobileMenu);
        }

        // Handle window resize
        window.addEventListener('resize', updateResponsive);

        // Handle browser back/forward
        window.addEventListener('popstate', function(e) {
            if (e.state && e.state.section) {
                loadSection(e.state.section, false);
            }
        });
    }

    // Chapter collapse/expand
    function setupChapterToggles() {
        elements.navChapterTitles.forEach(title => {
            title.addEventListener('click', function() {
                const chapter = this.parentElement;
                chapter.classList.toggle('expanded');
            });
        });
    }

    // Navigate to section
    function navigateToSection(sectionId) {
        if (sectionId === state.currentSection) return;

        // Update active state
        elements.navSections.forEach(s => s.classList.remove('active'));
        const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeNav) {
            activeNav.classList.add('active');

            // Expand parent chapter
            const parentChapter = activeNav.closest('.nav-chapter');
            if (parentChapter && !parentChapter.classList.contains('expanded')) {
                parentChapter.classList.add('expanded');
            }
        }

        // Load section
        loadSection(sectionId);

        // Close mobile menu
        if (state.isMobile) {
            closeMobileMenu();
        }

        // Update URL
        history.pushState({ section: sectionId }, '', `#${sectionId}`);
    }

    // Load section content
    async function loadSection(sectionId, updateHistory = true) {
        state.currentSection = sectionId;

        // Show loading
        elements.contentWrapper.innerHTML = '<div class="loading">Loading...</div>';

        try {
            const response = await fetch(`sections/${sectionId}.html`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const content = await response.text();
            elements.contentWrapper.innerHTML = content;

            // Scroll to top
            elements.contentWrapper.parentElement.scrollTop = 0;

            // Initialize section-specific functionality
            initializeSectionComponents();

            // Update history if needed
            if (updateHistory) {
                history.pushState({ section: sectionId }, '', `#${sectionId}`);
            }

        } catch (error) {
            console.error('Error loading section:', error);
            elements.contentWrapper.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2>Section Not Found</h2>
                    <p>The section "${sectionId}" could not be loaded.</p>
                    <p class="text-muted">Error: ${error.message}</p>
                </div>
            `;
        }
    }

    // Initialize components after section load
    function initializeSectionComponents() {
        // Reinitialize syntax highlighting
        if (typeof hljs !== 'undefined') {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }

        // Reinitialize MathJax
        if (typeof MathJax !== 'undefined') {
            MathJax.typesetPromise();
        }

        // Initialize interactive components
        if (typeof initializeComponents === 'function') {
            initializeComponents();
        }

        // Initialize questions
        if (typeof initializeQuestions === 'function') {
            initializeQuestions();
        }

        // Load section-specific JavaScript if it exists
        loadSectionScript(state.currentSection);

        // Scroll to anchor if one is pending (from QR code or direct link)
        if (state.pendingAnchor) {
            // Small delay to ensure content is rendered
            setTimeout(() => {
                const anchorElement = document.getElementById(state.pendingAnchor);
                if (anchorElement) {
                    anchorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Optional: highlight the element briefly
                    anchorElement.classList.add('highlight-anchor');
                    setTimeout(() => anchorElement.classList.remove('highlight-anchor'), 2000);
                }
                state.pendingAnchor = null;  // Clear after scrolling
            }, 300);
        }

        // Fade in animation
        elements.contentWrapper.classList.add('fade-in');
        setTimeout(() => {
            elements.contentWrapper.classList.remove('fade-in');
        }, 600);
    }

    // Load section-specific JavaScript file
    function loadSectionScript(sectionId) {
        // Remove previous section script if exists
        const oldScript = document.getElementById('section-script');
        if (oldScript) {
            oldScript.remove();
        }

        // Create and load new section script
        // Add timestamp to bust cache and ensure re-execution
        const script = document.createElement('script');
        script.id = 'section-script';
        script.src = `js/sections/${sectionId}.js?t=${Date.now()}`;
        script.onerror = () => {
            // Script doesn't exist - that's okay, not all sections need custom JS
            console.log(`No custom JS for section: ${sectionId}`);
        };
        document.body.appendChild(script);
    }

    // Mobile menu functions
    function toggleMobileMenu() {
        elements.sidebar.classList.toggle('open');
        elements.sidebarOverlay.classList.toggle('active');
    }

    function closeMobileMenu() {
        elements.sidebar.classList.remove('open');
        elements.sidebarOverlay.classList.remove('active');
    }

    // Responsive updates
    function updateResponsive() {
        const wasMobile = state.isMobile;
        state.isMobile = window.innerWidth <= 768;

        // Close mobile menu if switching to desktop
        if (wasMobile && !state.isMobile) {
            closeMobileMenu();
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Scroll to top function for button
    function scrollToTop() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Expose functions globally for onclick handlers
    window.navigateToSection = navigateToSection;
    window.scrollToTop = scrollToTop;

})();
