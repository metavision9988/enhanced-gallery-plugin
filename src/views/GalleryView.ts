import { ItemView, WorkspaceLeaf, TFile, Menu } from 'obsidian';
import EnhancedGalleryPlugin from '../../main';
import { ImageItem, GalleryFilter, ViewMode } from '../types/gallery';
import { GridView } from './GridView';
import { ListView } from './ListView';
import { FilterPanel } from '../components/FilterPanel';
import { SearchBar } from '../components/SearchBar';

export const VIEW_TYPE_GALLERY = 'enhanced-gallery-view';

export class GalleryView extends ItemView {
    plugin: EnhancedGalleryPlugin;
    private images: ImageItem[] = [];
    private filteredImages: ImageItem[] = [];
    private currentViewMode: ViewMode = 'grid';
    private currentFilter: GalleryFilter = {
        sortBy: 'date',
        sortOrder: 'desc'
    };
    
    private headerEl: HTMLElement;
    private galleryEl: HTMLElement;
    
    private gridView: GridView;
    private listView: ListView;
    private filterPanel: FilterPanel;
    private searchBar: SearchBar;
    
    private isLoading = false;
    private loadedImages = 0;
    private observer: IntersectionObserver | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: EnhancedGalleryPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentViewMode = plugin.settings.defaultViewMode;
    }

    getViewType(): string {
        return VIEW_TYPE_GALLERY;
    }

    getDisplayText(): string {
        return 'Enhanced Gallery';
    }

    getIcon(): string {
        return 'image';
    }

    async onOpen(): Promise<void> {
        const container = this.contentEl;
        container.empty();
        container.addClass('enhanced-gallery-view');

        // Create main structure
        this.createHeader();
        this.createFilterArea();
        this.createGalleryArea();
        
        // Initialize views
        this.gridView = new GridView(this.galleryEl, this.plugin);
        this.listView = new ListView(this.galleryEl, this.plugin);
        
        // Load images
        await this.loadImages();
        
        // Set up lazy loading if enabled
        if (this.plugin.settings.lazyLoading) {
            this.setupLazyLoading();
        }
        
        // Render initial view
        this.render();
    }

    async onClose(): Promise<void> {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    private createHeader(): void {
        this.headerEl = this.contentEl.createEl('div', { cls: 'gallery-header' });
        
        // Title and stats
        const titleSection = this.headerEl.createEl('div', { cls: 'gallery-title-section' });
        titleSection.createEl('h2', { text: 'Enhanced Gallery', cls: 'gallery-title' });
        
        const statsEl = titleSection.createEl('div', { cls: 'gallery-stats' });
        this.updateStats(statsEl);
        
        // View controls
        const viewControls = this.headerEl.createEl('div', { cls: 'view-controls' });
        
        const gridBtn = viewControls.createEl('button', {
            cls: `view-btn ${this.currentViewMode === 'grid' ? 'active' : ''}`,
            attr: { 'aria-label': 'Grid view' }
        });
        gridBtn.innerHTML = this.getSvgIcon('layout-grid');
        gridBtn.addEventListener('click', () => this.setViewMode('grid'));
        
        const listBtn = viewControls.createEl('button', {
            cls: `view-btn ${this.currentViewMode === 'list' ? 'active' : ''}`,
            attr: { 'aria-label': 'List view' }
        });
        listBtn.innerHTML = this.getSvgIcon('layout-list');
        listBtn.addEventListener('click', () => this.setViewMode('list'));
        
        const slideBtn = viewControls.createEl('button', {
            cls: `view-btn ${this.currentViewMode === 'slide' ? 'active' : ''}`,
            attr: { 'aria-label': 'Slideshow view' }
        });
        slideBtn.innerHTML = this.getSvgIcon('presentation');
        slideBtn.addEventListener('click', () => this.setViewMode('slide'));
        
        // Action buttons
        const actions = this.headerEl.createEl('div', { cls: 'gallery-actions' });
        
        const refreshBtn = actions.createEl('button', {
            cls: 'action-btn',
            attr: { 'aria-label': 'Refresh gallery' }
        });
        refreshBtn.innerHTML = this.getSvgIcon('refresh-cw');
        refreshBtn.addEventListener('click', () => this.refresh());
        
        const settingsBtn = actions.createEl('button', {
            cls: 'action-btn',
            attr: { 'aria-label': 'Gallery settings' }
        });
        settingsBtn.innerHTML = this.getSvgIcon('settings');
        settingsBtn.addEventListener('click', () => this.openSettings());
    }

    private createFilterArea(): void {
        const filterArea = this.contentEl.createEl('div', { cls: 'gallery-filter-area' });
        
        // Search bar
        this.searchBar = new SearchBar(filterArea, this.plugin);
        this.searchBar.onSearch = (query: string) => {
            this.currentFilter.searchText = query;
            this.applyFilter();
        };
        
        // Filter panel
        this.filterPanel = new FilterPanel(filterArea, this.plugin);
        this.filterPanel.onFilterChange = (filter: Partial<GalleryFilter>) => {
            this.currentFilter = { ...this.currentFilter, ...filter };
            this.applyFilter();
        };
    }

    private createGalleryArea(): void {
        this.galleryEl = this.contentEl.createEl('div', { cls: 'gallery-content' });
        
        // Loading indicator
        const loadingEl = this.galleryEl.createEl('div', { cls: 'gallery-loading hidden' });
        loadingEl.createEl('div', { cls: 'loading-spinner' });
        loadingEl.createEl('p', { text: 'Loading images...' });
    }

    private async loadImages(): Promise<void> {
        this.setLoading(true);
        
        try {
            // Scan for images
            this.images = await this.plugin.imageScanner.scanVault();
            
            // Apply initial filter and sort
            this.filteredImages = [...this.images];
            this.applyFilter();
            
            // Update stats
            const statsEl = this.headerEl.querySelector('.gallery-stats');
            if (statsEl) {
                this.updateStats(statsEl as HTMLElement);
            }
        } catch (error) {
            console.error('Failed to load images:', error);
            this.showError('Failed to load images. Please try refreshing.');
        } finally {
            this.setLoading(false);
        }
    }

    private applyFilter(): void {
        // Apply search filter
        let filtered = [...this.images];
        
        if (this.currentFilter.searchText) {
            const searchLower = this.currentFilter.searchText.toLowerCase();
            filtered = filtered.filter(img =>
                img.name.toLowerCase().includes(searchLower) ||
                img.path.toLowerCase().includes(searchLower) ||
                img.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply tag filter
        if (this.currentFilter.selectedTags && this.currentFilter.selectedTags.length > 0) {
            filtered = filtered.filter(img =>
                this.currentFilter.selectedTags!.some(tagName =>
                    img.tags.some(tag => tag.name === tagName)
                )
            );
        }
        
        // Apply date filter
        if (this.currentFilter.dateRange) {
            filtered = filtered.filter(img =>
                img.dateCreated >= this.currentFilter.dateRange!.start &&
                img.dateCreated <= this.currentFilter.dateRange!.end
            );
        }
        
        // Apply file type filter
        if (this.currentFilter.fileTypes && this.currentFilter.fileTypes.length > 0) {
            filtered = filtered.filter(img =>
                this.currentFilter.fileTypes!.includes(img.format.toLowerCase())
            );
        }
        
        // Apply size filter
        if (this.currentFilter.sizeRange) {
            filtered = filtered.filter(img =>
                img.size >= this.currentFilter.sizeRange!.min &&
                img.size <= this.currentFilter.sizeRange!.max
            );
        }
        
        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (this.currentFilter.sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = a.dateCreated.getTime() - b.dateCreated.getTime();
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'usage':
                    comparison = a.usageCount - b.usageCount;
                    break;
                case 'quality':
                    const aQuality = a.analysis?.quality.score || 0;
                    const bQuality = b.analysis?.quality.score || 0;
                    comparison = aQuality - bQuality;
                    break;
            }
            
            return this.currentFilter.sortOrder === 'asc' ? comparison : -comparison;
        });
        
        this.filteredImages = filtered;
        this.render();
    }

    private render(): void {
        // Clear gallery content
        this.galleryEl.empty();
        
        // Render based on current view mode
        switch (this.currentViewMode) {
            case 'grid':
                this.gridView.render(this.getImagesToRender());
                break;
            case 'list':
                this.listView.render(this.getImagesToRender());
                break;
            case 'slide':
                // Slideshow view to be implemented
                break;
        }
        
        // Update stats
        const statsEl = this.headerEl.querySelector('.gallery-stats');
        if (statsEl) {
            this.updateStats(statsEl as HTMLElement);
        }
    }

    private getImagesToRender(): ImageItem[] {
        if (!this.plugin.settings.lazyLoading) {
            return this.filteredImages;
        }
        
        // Return only loaded images for lazy loading
        return this.filteredImages.slice(0, this.loadedImages || this.plugin.settings.imagesPerPage);
    }

    private setupLazyLoading(): void {
        this.loadedImages = this.plugin.settings.imagesPerPage;
        
        // Create sentinel element for intersection observer
        const sentinel = this.galleryEl.createEl('div', { cls: 'lazy-load-sentinel' });
        
        this.observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !this.isLoading) {
                    this.loadMoreImages();
                }
            },
            { threshold: 0.1 }
        );
        
        this.observer.observe(sentinel);
    }

    private loadMoreImages(): void {
        if (this.loadedImages >= this.filteredImages.length) {
            return;
        }
        
        const nextBatch = Math.min(
            this.loadedImages + this.plugin.settings.imagesPerPage,
            this.filteredImages.length
        );
        
        this.loadedImages = nextBatch;
        this.render();
    }

    private setViewMode(mode: ViewMode): void {
        this.currentViewMode = mode;
        
        // Update button states
        this.headerEl.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = this.headerEl.querySelector(`.view-btn:nth-child(${
            mode === 'grid' ? 1 : mode === 'list' ? 2 : 3
        })`);
        activeBtn?.classList.add('active');
        
        this.render();
    }

    private async refresh(): Promise<void> {
        await this.loadImages();
    }

    private openSettings(): void {
        // @ts-ignore
        this.app.setting.open();
        // @ts-ignore
        this.app.setting.openTabById('enhanced-gallery');
    }

    private updateStats(statsEl: HTMLElement): void {
        statsEl.empty();
        statsEl.createEl('span', {
            text: `${this.filteredImages.length} / ${this.images.length} images`,
            cls: 'stat-item'
        });
        
        if (this.currentFilter.selectedTags && this.currentFilter.selectedTags.length > 0) {
            statsEl.createEl('span', {
                text: `${this.currentFilter.selectedTags.length} tags`,
                cls: 'stat-item'
            });
        }
    }

    private setLoading(loading: boolean): void {
        this.isLoading = loading;
        const loadingEl = this.galleryEl.querySelector('.gallery-loading');
        if (loadingEl) {
            if (loading) {
                loadingEl.classList.remove('hidden');
            } else {
                loadingEl.classList.add('hidden');
            }
        }
    }

    private showError(message: string): void {
        const errorEl = this.galleryEl.createEl('div', { cls: 'gallery-error' });
        errorEl.createEl('p', { text: message });
        const retryBtn = errorEl.createEl('button', { text: 'Retry' });
        retryBtn.addEventListener('click', () => this.refresh());
    }

    private getSvgIcon(name: string): string {
        const icons: Record<string, string> = {
            'layout-grid': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
            'layout-list': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
            'presentation': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></svg>',
            'refresh-cw': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
            'settings': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"></path></svg>'
        };
        return icons[name] || '';
    }
}