// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Handle navigation link clicks
    const navLinks = document.querySelectorAll('.nav-link, .btn[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 70; // Account for fixed nav
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Add scroll effect to navigation
    const nav = document.querySelector('.nav');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            nav.style.background = 'rgba(255, 255, 255, 0.98)';
            nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            nav.style.background = 'rgba(255, 255, 255, 0.95)';
            nav.style.boxShadow = 'none';
        }
        
        lastScrollY = currentScrollY;
    });

    // Animate feature showcases on scroll
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature showcases
    const featureShowcases = document.querySelectorAll('.feature-showcase');
    featureShowcases.forEach((showcase, index) => {
        showcase.style.opacity = '0';
        showcase.style.transform = 'translateY(30px)';
        showcase.style.transition = `opacity 0.8s ease ${index * 0.2}s, transform 0.8s ease ${index * 0.2}s`;
        observer.observe(showcase);
    });

    // Animate app preview
    const appPreview = document.querySelector('.app-preview');
    if (appPreview) {
        // Add subtle floating animation
        let floatDirection = 1;
        setInterval(() => {
            const currentTransform = appPreview.style.transform || 'scale(1.1) translateY(0px)';
            const currentY = parseFloat(currentTransform.match(/translateY\(([^)]+)\)/) || [0, 0])[1];
            const newY = currentY + (floatDirection * 0.5);
            
            if (Math.abs(newY) > 10) {
                floatDirection *= -1;
            }
            
            appPreview.style.transform = `scale(1.1) translateY(${newY}px)`;
        }, 100);
    }

    // Company logo sources
    const logoSources = {
        apple: [
            'https://img.logo.dev/apple.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
            'https://cdn.brandfetch.io/apple.com/w/400/h/400/theme/dark/icon.jpeg?c=1id4bDqx2b4Bxb_5rM',
            'https://icon.horse/icon/apple.com',
            'https://logo.clearbit.com/apple.com'
        ],
        google: [
            'https://img.logo.dev/google.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
            'https://cdn.brandfetch.io/google.com/w/400/h/400/theme/light/icon.png?c=1id4bDqx2b4Bxb_5rM',
            'https://icon.horse/icon/google.com',
            'https://logo.clearbit.com/google.com'
        ],
        microsoft: [
            'https://img.logo.dev/microsoft.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
            'https://cdn.brandfetch.io/microsoft.com/w/400/h/400/theme/light/icon.png?c=1id4bDqx2b4Bxb_5rM',
            'https://icon.horse/icon/microsoft.com',
            'https://logo.clearbit.com/microsoft.com'
        ],
        netflix: [
            'https://img.logo.dev/netflix.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
            'https://cdn.brandfetch.io/netflix.com/w/400/h/400/theme/dark/icon.png?c=1id4bDqx2b4Bxb_5rM',
            'https://icon.horse/icon/netflix.com',
            'https://logo.clearbit.com/netflix.com'
        ],
        spotify: [
            'https://img.logo.dev/spotify.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
            'https://cdn.brandfetch.io/spotify.com/w/400/h/400/theme/dark/icon.png?c=1id4bDqx2b4Bxb_5rM',
            'https://icon.horse/icon/spotify.com',
            'https://logo.clearbit.com/spotify.com'
        ]
    };

    // Fallback SVGs for each company
    const fallbackLogos = {
        apple: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4LjcxIDE5LjVjLS44MyAxLjI0LTEuNzEgMi40NS0zLjA1IDIuNDctMS4zNC4wMy0xLjc3LS43OS0zLjI5LS43OS0xLjUzIDAtMiAuNzctMy4yNy44Mi0xLjMxLjA1LTIuMy0xLjMyLTMuMTQtMi41M0M0LjI1IDE3IDIuOTQgMTIuNDUgNC43IDkuMzljLjg3LTEuNTIgMi40My0yLjQ4IDQuMTItMi41MSAxLjI4LS4wMiAyLjUuODcgMy4yOS44Ny43OCAwIDIuMjYtMS4wNyAzLjgxLS45MS42NS4wMyAyLjQ3LjI2IDMuNjQgMS45OC0uMDkuMDYtMi4xNyAxLjI4LTIuMTUgMy44MS4wMyAzLjAyIDIuNjUgNC4wMyAyLjY4IDQuMDQtLjAzLjA3LS40MiAxLjQ0LTEuMzggMi44M00xMyAzLjVjLjczLS44MyAxLjk0LTEuNDYgMi45NC0xLjUuMTMgMS4xNy0uMzQgMi4zNS0xLjA0IDMuMTktLjY5Ljg1LTEuODMgMS41MS0yLjk1IDEuNDItLjE1LTEuMTUuNDEtMi4zNSAxLjA1LTMuMTF6Ii8+Cjwvc3ZnPgo=',
        google: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIyLjU2IDEyLjI1YzAtLjc4LS4wNy0xLjUzLS4yLTIuMjVIMTJ2NC4yNmg1LjkyYy0uMjYgMS4zNy0xLjA0IDIuNTMtMi4yMSAzLjMxdjIuNzdoMy41N2MyLjA4LTEuOTIgMy4yOC00Ljc0IDMuMjgtOC4wOXoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTEyIDIzYzIuOTcgMCA1LjQ2LS45OCA3LjI4LTIuNjZsLTMuNTctMi43N2MtLjk4LjY2LTIuMjMgMS4wNi0zLjcxIDEuMDYtMi44NiAwLTUuMjktMS45My02LjE2LTQuNTNIMi4xOHYyLjg0QzMuOTkgMjAuNTMgNy43IDIzIDEyIDIzeiIgZmlsbD0iIzM0QTg1MyIvPgo8cGF0aCBkPSJNNS44NCAxNC4wOWMtLjIyLS42Ni0uMzUtMS4zNi0uMzUtMi4wOXMuMTMtMS40My4zNS0yLjA5VjcuMDdIMi4xOEMxLjQzIDguNTUgMSAxMC4yMiAxIDEyczQzIDMuNDUgMS4xOCA0LjkzbDIuODUtMi4yMi44MS0uNjJ6IiBmaWxsPSIjRkJCQzA1Ii8+CjxwYXRoIGQ9Ik0xMiA1LjM4YzEuNjIgMCAzLjA2LjU2IDQuMjEgMS42NGwzLjE1LTMuMTVDMTcuNDUgMi4wOSAxNC45NyAxIDEyIDEgNy43IDEgMy45OSAzLjQ3IDIuMTggNy4wN2wzLjY2IDIuODRjLjg3LTIuNiAzLjMtNC41MyA2LjE2LTQuNTN6IiBmaWxsPSIjRUE0MzM1Ii8+Cjwvc3ZnPgo=',
        microsoft: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iI0YyNTAyMiIvPgo8cmVjdCB4PSIxMyIgeT0iMiIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iIzdGQkEwMCIvPgo8cmVjdCB4PSIyIiB5PSIxMyIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iIzAwQTRFRiIvPgo8cmVjdCB4PSIxMyIgeT0iMTMiIHdpZHRoPSI5IiBoZWlnaHQ9IjkiIGZpbGw9IiNGRkI5MDAiLz4KPC9zdmc+Cg==',
        netflix: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0U1MDkxNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuMzk4IDB2LjAwNmMzLjAyOCA4LjU1NiA1LjM3IDE1LjE3NSA4LjM0OCAyMy41OTYgMi4zNDQuMDU4IDQuODUuMzk4IDQuODU0LjM5OC0yLjgtNy45MjQtNS45MjMtMTYuNzQ3LTguNDg3LTI0em04LjQ4OSAwdjkuNjNMMTguNiAyMi45NTFjLS4wNDMtNy44Ni0uMDA0LTE1LjMwNy4wMDItMjIuOTV6TTUuMzk4IDEuMDVWMjRjMi44NzMtLjA4NiA1LjU0Mi0uMjM0IDguNDg5LS40NVYxLjA1eiIvPgo8L3N2Zz4K',
        spotify: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzFEQjk1NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDBDNS40IDAgMCA1LjQgMCAxMnM1LjQgMTIgMTIgMTIgMTItNS40IDEyLTEyUzE4LjY2IDAgMTIgMHptNS41MjEgMTcuMzRjLS4yNC4zNTktLjY2LjQ4LTEuMDIxLjI0LTIuODItMS43NC02LjM2LTIuMTAxLTEwLjU2MS0xLjE0MS0uNDE4LjEyMi0uNzc5LS4xNzktLjg5OS0uNTM5LS4xMi0uNDIxLjE4LS43OC41NC0uOSA0LjU2LTEuMDIxIDguNTItLjYgMTEuNjQgMS4zMi40Mi4xOC40NzkuNjU5LjMwMSAxLjAyem0xLjQ0LTMuM2MtLjMwMS40Mi0uODQxLjYtMS4yNjIuMy0zLjIzOS0xLjk4LTguMTU5LTIuNTgtMTEuOTM5LTEuMzgtLjQ3OS4xMi0xLjAyLS4xMi0xLjE0LS42LS4xMi0uNDguMTItMS4wMjEuNi0xLjE0MUM5LjYgOS45IDE1IDEwLjU2MSAxOC43MiAxMi44NGMuMzYxLjE4MS41NC43OC4yNDEgMS4yem0uMTItMy4zNkMxNS4yNCA4LjQgOC44MiA4LjE2IDUuMTYgOS4zMDFjLS42LjE3OS0xLjItLjE4MS0xLjM4LS43MjEtLjE4LS42MDEuMTgtMS4yLjcyLTEuMzgxIDQuMjYtMS4yNiAxMS4yOC0xLjAyIDE1LjcyMSAxLjYyMS41MzkuMy43MTkgMS4wMi40MiAxLjU2LS4yOTkuNDIxLTEuMDIuNTk5LTEuNTU5LjN6Ii8+Cjwvc3ZnPgo='
    };

    // Add realistic typing animation to search input
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        const searches = ['apple', 'google', 'microsoft', 'netflix', 'spotify'];
        let currentSearchIndex = 0;
        
        const updateLogos = (company) => {
            const logoCards = document.querySelectorAll('.logo-card');
            const sources = logoSources[company] || logoSources.apple;
            const fallback = fallbackLogos[company] || fallbackLogos.apple;
            
            logoCards.forEach((card, index) => {
                const logoImage = card.querySelector('.logo-image');
                if (logoImage && sources[index]) {
                    logoImage.src = sources[index];
                    logoImage.onerror = function() {
                        this.src = fallback;
                    };
                }
            });
        };
        
        const typeSearch = (text) => {
            searchInput.value = '';
            let i = 0;
            
            const typeWriter = () => {
                if (i < text.length) {
                    searchInput.value += text.charAt(i);
                    i++;
                    setTimeout(typeWriter, 80 + Math.random() * 40); // Vary typing speed
                } else {
                    // Update logos to match the search
                    updateLogos(text);
                    
                    // Wait before starting next search
                    setTimeout(() => {
                        currentSearchIndex = (currentSearchIndex + 1) % searches.length;
                        typeSearch(searches[currentSearchIndex]);
                    }, 3000);
                }
            };
            
            typeWriter();
        };
        
        // Start typing animation after a delay
        setTimeout(() => {
            typeSearch(searches[currentSearchIndex]);
        }, 2000);
    }

    // Add realistic interactions to logo cards
    const logoCards = document.querySelectorAll('.logo-card');
    logoCards.forEach(card => {
        // Add drag simulation
        card.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // Left click
                this.style.cursor = 'grabbing';
                this.style.transform = 'translateY(-2px) scale(0.98)';
                
                // Add a subtle drag indicator
                const dragIndicator = document.createElement('div');
                dragIndicator.style.cssText = `
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: rgba(34, 197, 94, 0.8);
                    box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
                    animation: pulse 0.8s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 5;
                `;
                this.appendChild(dragIndicator);
                
                setTimeout(() => {
                    if (dragIndicator.parentNode) {
                        dragIndicator.remove();
                    }
                }, 1000);
            }
        });
        
        card.addEventListener('mouseup', function() {
            this.style.cursor = 'grab';
        });
        
        // Add right-click context menu simulation
        card.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            
            // Create a simple context menu
            const existingMenu = document.querySelector('.demo-context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }
            
            const contextMenu = document.createElement('div');
            contextMenu.className = 'demo-context-menu';
            contextMenu.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 8px;
                padding: 8px 0;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(0, 0, 0, 0.1);
                z-index: 1000;
                font-size: 12px;
                min-width: 120px;
            `;
            
            const copyOption = document.createElement('div');
            copyOption.textContent = 'Copy Logo';
            copyOption.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                transition: background 0.2s ease;
            `;
            copyOption.addEventListener('mouseenter', () => {
                copyOption.style.background = 'rgba(20, 184, 166, 0.1)';
            });
            copyOption.addEventListener('mouseleave', () => {
                copyOption.style.background = 'transparent';
            });
            
            const saveOption = document.createElement('div');
            saveOption.textContent = 'Save Logo';
            saveOption.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                transition: background 0.2s ease;
            `;
            saveOption.addEventListener('mouseenter', () => {
                saveOption.style.background = 'rgba(20, 184, 166, 0.1)';
            });
            saveOption.addEventListener('mouseleave', () => {
                saveOption.style.background = 'transparent';
            });
            
            contextMenu.appendChild(copyOption);
            contextMenu.appendChild(saveOption);
            document.body.appendChild(contextMenu);
            
            // Remove menu when clicking elsewhere
            setTimeout(() => {
                document.addEventListener('click', function removeMenu() {
                    contextMenu.remove();
                    document.removeEventListener('click', removeMenu);
                });
            }, 100);
        });
    });

    // Handle download button clicks
    const downloadButtons = document.querySelectorAll('.btn-primary');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.textContent.includes('Download')) {
                e.preventDefault();
                
                // Show download modal or redirect to actual download
                alert('Download would start here! 🚀\n\nIn a real implementation, this would:\n• Start the DMG download\n• Track analytics\n• Show installation instructions');
            }
        });
    });

    // Remove parallax effect for better readability
    // Hero section now scrolls normally

    // Stats counter animation
    const stats = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const text = target.textContent;
                
                if (text.includes('+')) {
                    // Animate numbers
                    const number = parseInt(text.replace('+', ''));
                    let current = 0;
                    const increment = number / 30;
                    
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= number) {
                            target.textContent = number + '+';
                            clearInterval(timer);
                        } else {
                            target.textContent = Math.floor(current) + '+';
                        }
                    }, 50);
                }
                
                statsObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => {
        statsObserver.observe(stat);
    });
});

// Add some interactive elements
document.addEventListener('mousemove', (e) => {
    const cursor = document.querySelector('.cursor');
    if (!cursor) {
        const newCursor = document.createElement('div');
        newCursor.className = 'cursor';
        newCursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: rgba(102, 126, 234, 0.3);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            transition: transform 0.1s ease;
            display: none;
        `;
        document.body.appendChild(newCursor);
    }
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modals or reset focus
        document.activeElement.blur();
    }
    
    if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

    // Add loading state simulation
    const logoGridContainer = document.querySelector('.logo-grid-container');
    const originalCards = Array.from(logoGridContainer.children);
    
    const showLoadingState = () => {
        logoGridContainer.innerHTML = '';
        
        // Create loading placeholders
        for (let i = 0; i < 6; i++) {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
                aspect-ratio: 1;
                border-radius: 12px;
                background: linear-gradient(90deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.08) 50%, rgba(0, 0, 0, 0.04) 100%);
                background-size: 200% 100%;
                animation: shimmer 1.5s ease-in-out infinite;
                border: 1px solid rgba(0, 0, 0, 0.06);
            `;
            logoGridContainer.appendChild(placeholder);
        }
    };
    
    const showResults = () => {
        logoGridContainer.innerHTML = '';
        originalCards.forEach(card => {
            logoGridContainer.appendChild(card);
        });
    };
    
    // Simulate search when typing animation changes
    let lastSearchValue = '';
    const checkForSearchChange = () => {
        if (searchInput && searchInput.value !== lastSearchValue && searchInput.value.length > 2) {
            lastSearchValue = searchInput.value;
            
            // Show loading state
            showLoadingState();
            
            // Show results after a realistic delay
            setTimeout(showResults, 800 + Math.random() * 400);
        }
        
        setTimeout(checkForSearchChange, 200);
    };
    
    setTimeout(checkForSearchChange, 3000);