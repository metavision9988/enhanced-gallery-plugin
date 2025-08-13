import EnhancedGalleryPlugin from '../../main';

export class SearchBar {
    private container: HTMLElement;
    private plugin: EnhancedGalleryPlugin;
    private searchEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    public onSearch?: (query: string) => void;
    
    private debounceTimeout: NodeJS.Timeout | null = null;

    constructor(container: HTMLElement, plugin: EnhancedGalleryPlugin) {
        this.container = container;
        this.plugin = plugin;
        this.render();
    }

    private render(): void {
        this.searchEl = this.container.createEl('div', { cls: 'search-bar' });
        
        this.inputEl = this.searchEl.createEl('input', {
            cls: 'search-input',
            type: 'text',
            placeholder: 'Search images by name, path, or tags...'
        });

        // Add search icon
        const searchIcon = this.searchEl.createEl('div', { cls: 'search-icon' });
        searchIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="21 21l-4.35-4.35"></path>
            </svg>
        `;

        // Add event listeners
        this.inputEl.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value;
            this.debouncedSearch(query);
        });

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clear();
            }
        });

        // Add clear button (appears when there's text)
        const clearBtn = this.searchEl.createEl('button', {
            cls: 'search-clear hidden',
            attr: { 'aria-label': 'Clear search' }
        });
        clearBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" 
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        
        clearBtn.addEventListener('click', () => {
            this.clear();
        });

        // Show/hide clear button based on input
        this.inputEl.addEventListener('input', () => {
            if (this.inputEl!.value.trim()) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        });
    }

    private debouncedSearch(query: string): void {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        this.debounceTimeout = setTimeout(() => {
            if (this.onSearch) {
                this.onSearch(query.trim());
            }
        }, 300);
    }

    clear(): void {
        if (this.inputEl) {
            this.inputEl.value = '';
            this.inputEl.focus();
            
            const clearBtn = this.searchEl?.querySelector('.search-clear');
            clearBtn?.classList.add('hidden');
            
            if (this.onSearch) {
                this.onSearch('');
            }
        }
    }

    setValue(value: string): void {
        if (this.inputEl) {
            this.inputEl.value = value;
            
            const clearBtn = this.searchEl?.querySelector('.search-clear');
            if (value.trim()) {
                clearBtn?.classList.remove('hidden');
            } else {
                clearBtn?.classList.add('hidden');
            }
        }
    }

    getValue(): string {
        return this.inputEl?.value || '';
    }

    focus(): void {
        this.inputEl?.focus();
    }
}