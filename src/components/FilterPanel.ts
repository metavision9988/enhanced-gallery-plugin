import EnhancedGalleryPlugin from '../../main';
import { GalleryFilter } from '../types/gallery';

export class FilterPanel {
    private container: HTMLElement;
    private plugin: EnhancedGalleryPlugin;
    private panelEl: HTMLElement | null = null;
    public onFilterChange?: (filter: Partial<GalleryFilter>) => void;

    constructor(container: HTMLElement, plugin: EnhancedGalleryPlugin) {
        this.container = container;
        this.plugin = plugin;
        this.render();
    }

    private render(): void {
        this.panelEl = this.container.createEl('div', { cls: 'filter-panel' });

        // File type filters
        this.createFileTypeFilters();
        
        // Sort options
        this.createSortControls();
        
        // Quick filters
        this.createQuickFilters();
    }

    private createFileTypeFilters(): void {
        const fileTypeGroup = this.panelEl!.createEl('div', { cls: 'filter-group' });
        fileTypeGroup.createEl('span', { 
            text: 'Type:', 
            cls: 'filter-label' 
        });

        const fileTypes = [
            { name: 'All', value: 'all' },
            { name: 'JPG', value: 'jpg' },
            { name: 'PNG', value: 'png' },
            { name: 'GIF', value: 'gif' },
            { name: 'WebP', value: 'webp' },
            { name: 'SVG', value: 'svg' }
        ];

        fileTypes.forEach(type => {
            const btn = fileTypeGroup.createEl('button', {
                text: type.name,
                cls: `filter-btn ${type.value === 'all' ? 'active' : ''}`
            });

            btn.addEventListener('click', () => {
                // Toggle active state
                fileTypeGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Apply filter
                const fileTypes = type.value === 'all' ? undefined : [type.value];
                this.notifyFilterChange({ fileTypes });
            });
        });
    }

    private createSortControls(): void {
        const sortGroup = this.panelEl!.createEl('div', { cls: 'filter-group' });
        sortGroup.createEl('span', { 
            text: 'Sort by:', 
            cls: 'filter-label' 
        });

        const sortOptions = [
            { name: 'Date', value: 'date' },
            { name: 'Name', value: 'name' },
            { name: 'Size', value: 'size' },
            { name: 'Usage', value: 'usage' }
        ];

        const sortSelect = sortGroup.createEl('select', { cls: 'filter-select' });
        
        sortOptions.forEach(option => {
            const optionEl = sortSelect.createEl('option', {
                text: option.name,
                value: option.value
            });
            
            if (option.value === 'date') {
                optionEl.selected = true;
            }
        });

        const orderBtn = sortGroup.createEl('button', {
            cls: 'filter-btn order-btn',
            attr: { 'data-order': 'desc', 'aria-label': 'Sort order' }
        });
        orderBtn.innerHTML = this.getOrderIcon('desc');

        sortSelect.addEventListener('change', () => {
            this.notifyFilterChange({
                sortBy: sortSelect.value as any,
                sortOrder: orderBtn.getAttribute('data-order') as 'asc' | 'desc'
            });
        });

        orderBtn.addEventListener('click', () => {
            const currentOrder = orderBtn.getAttribute('data-order');
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            
            orderBtn.setAttribute('data-order', newOrder);
            orderBtn.innerHTML = this.getOrderIcon(newOrder);
            
            this.notifyFilterChange({
                sortBy: sortSelect.value as any,
                sortOrder: newOrder as 'asc' | 'desc'
            });
        });
    }

    private createQuickFilters(): void {
        const quickGroup = this.panelEl!.createEl('div', { cls: 'filter-group' });
        quickGroup.createEl('span', { 
            text: 'Show:', 
            cls: 'filter-label' 
        });

        const quickFilters = [
            { name: 'All', value: 'all' },
            { name: 'Used in notes', value: 'used' },
            { name: 'Unused', value: 'unused' },
            { name: 'AI tagged', value: 'ai-tagged' }
        ];

        quickFilters.forEach((filter, index) => {
            const btn = quickGroup.createEl('button', {
                text: filter.name,
                cls: `filter-btn ${index === 0 ? 'active' : ''}`
            });

            btn.addEventListener('click', () => {
                // Toggle active state
                quickGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Apply filter based on selection
                let filterChanges: Partial<GalleryFilter> = {};
                
                switch (filter.value) {
                    case 'used':
                        filterChanges.hasNotes = true;
                        break;
                    case 'unused':
                        filterChanges.hasNotes = false;
                        break;
                    case 'ai-tagged':
                        // This would filter for images with AI-generated tags
                        // Implementation would depend on how we track AI tags
                        break;
                    case 'all':
                    default:
                        filterChanges.hasNotes = undefined;
                        break;
                }

                this.notifyFilterChange(filterChanges);
            });
        });
    }

    private getOrderIcon(order: string): string {
        if (order === 'asc') {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 15l5-5 5 5"/>
                </svg>
            `;
        } else {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 9l5 5 5-5"/>
                </svg>
            `;
        }
    }

    private notifyFilterChange(changes: Partial<GalleryFilter>): void {
        if (this.onFilterChange) {
            this.onFilterChange(changes);
        }
    }

    addTagFilter(tagName: string): void {
        // This would add a tag filter button dynamically
        // Implementation would create a removable tag filter
    }

    clearAllFilters(): void {
        // Reset all filters to default state
        if (this.panelEl) {
            // Reset file type to "All"
            const fileTypeBtns = this.panelEl.querySelectorAll('.filter-group:first-child .filter-btn');
            fileTypeBtns.forEach(btn => btn.classList.remove('active'));
            fileTypeBtns[0]?.classList.add('active');

            // Reset sort to date desc
            const sortSelect = this.panelEl.querySelector('.filter-select') as HTMLSelectElement;
            if (sortSelect) {
                sortSelect.value = 'date';
            }

            const orderBtn = this.panelEl.querySelector('.order-btn');
            if (orderBtn) {
                orderBtn.setAttribute('data-order', 'desc');
                orderBtn.innerHTML = this.getOrderIcon('desc');
            }

            // Reset quick filters to "All"
            const quickBtns = this.panelEl.querySelectorAll('.filter-group:last-child .filter-btn');
            quickBtns.forEach(btn => btn.classList.remove('active'));
            quickBtns[0]?.classList.add('active');

            // Notify of reset
            this.notifyFilterChange({
                fileTypes: undefined,
                sortBy: 'date',
                sortOrder: 'desc',
                hasNotes: undefined
            });
        }
    }
}