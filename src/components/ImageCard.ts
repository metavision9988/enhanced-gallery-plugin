import EnhancedGalleryPlugin from '../../main';
import { ImageItem } from '../types/gallery';

export class ImageCard {
    private container: HTMLElement;
    private plugin: EnhancedGalleryPlugin;
    private image: ImageItem;
    private cardEl: HTMLElement | null = null;
    private isLoaded = false;

    constructor(container: HTMLElement, plugin: EnhancedGalleryPlugin, image: ImageItem) {
        this.container = container;
        this.plugin = plugin;
        this.image = image;
    }

    render(): void {
        this.cardEl = this.container.createEl('div', { cls: 'image-card' });
        
        // Add loading state
        this.cardEl.addClass('loading');
        
        // Create thumbnail container
        const thumbnailContainer = this.cardEl.createEl('div', { cls: 'image-thumbnail-container' });
        
        // Create image element
        const img = thumbnailContainer.createEl('img', {
            cls: 'image-thumbnail',
            attr: {
                alt: this.image.name,
                loading: this.plugin.settings.lazyLoading ? 'lazy' : 'eager'
            }
        });
        
        // Load thumbnail or original image
        this.loadImage(img);
        
        // Create overlay with metadata
        const overlay = this.cardEl.createEl('div', { cls: 'image-overlay' });
        
        // Image name
        const titleEl = overlay.createEl('div', { cls: 'image-title' });
        titleEl.createEl('span', { text: this.image.name });
        
        // Image metadata
        const metaEl = overlay.createEl('div', { cls: 'image-meta' });
        
        if (this.plugin.settings.showMetadata) {
            // Dimensions
            const dimensions = `${this.image.dimensions.width}×${this.image.dimensions.height}`;
            metaEl.createEl('span', { 
                text: dimensions,
                cls: 'meta-item meta-dimensions' 
            });
            
            // File size
            metaEl.createEl('span', { 
                text: this.formatFileSize(this.image.size),
                cls: 'meta-item meta-size' 
            });
            
            // Format
            metaEl.createEl('span', { 
                text: this.image.format.toUpperCase(),
                cls: 'meta-item meta-format' 
            });
        }
        
        // Tags
        if (this.plugin.settings.showTags && this.image.tags.length > 0) {
            const tagsEl = overlay.createEl('div', { cls: 'image-tags' });
            
            this.image.tags.slice(0, 5).forEach(tag => {
                const tagEl = tagsEl.createEl('span', {
                    text: tag.name,
                    cls: `tag ${tag.category === 'auto' ? 'tag-auto' : 'tag-manual'}`
                });
                
                if (tag.color) {
                    tagEl.style.setProperty('--tag-color', tag.color);
                }
                
                if (tag.confidence) {
                    tagEl.setAttribute('data-confidence', tag.confidence.toString());
                }
            });
            
            if (this.image.tags.length > 5) {
                tagsEl.createEl('span', {
                    text: `+${this.image.tags.length - 5}`,
                    cls: 'tag tag-more'
                });
            }
        }
        
        // Usage indicator
        if (this.image.relatedNotes.length > 0) {
            const usageEl = this.cardEl.createEl('div', { cls: 'usage-indicator' });
            usageEl.createEl('span', { text: this.image.relatedNotes.length.toString() });
            usageEl.setAttribute('title', `Used in ${this.image.relatedNotes.length} notes`);
        }
        
        // Quality indicator (if available)
        if (this.image.analysis?.quality) {
            const qualityEl = this.cardEl.createEl('div', { cls: 'quality-indicator' });
            const score = Math.round(this.image.analysis.quality.score * 100);
            qualityEl.setAttribute('data-quality', this.getQualityLevel(score));
            qualityEl.setAttribute('title', `Quality: ${score}%`);
        }
        
        // AI indicator
        if (this.image.analysis) {
            const aiEl = this.cardEl.createEl('div', { cls: 'ai-indicator' });
            aiEl.setAttribute('title', 'AI analyzed');
        }
    }

    private async loadImage(img: HTMLImageElement): Promise<void> {
        try {
            // Try to load thumbnail first
            if (this.image.thumbnailPath) {
                const thumbnailFile = this.plugin.app.vault.getAbstractFileByPath(this.image.thumbnailPath);
                if (thumbnailFile) {
                    const thumbnailUrl = this.plugin.app.vault.getResourcePath(thumbnailFile as any);
                    img.src = thumbnailUrl;
                    img.onload = () => this.onImageLoad();
                    img.onerror = () => this.loadOriginalImage(img);
                    return;
                }
            }
            
            // Load original image
            await this.loadOriginalImage(img);
        } catch (error) {
            console.error(`Failed to load image ${this.image.path}:`, error);
            this.showErrorState();
        }
    }

    private async loadOriginalImage(img: HTMLImageElement): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.image.path);
        if (file) {
            const url = this.plugin.app.vault.getResourcePath(file as any);
            img.src = url;
            img.onload = () => this.onImageLoad();
            img.onerror = () => this.showErrorState();
        } else {
            this.showErrorState();
        }
    }

    private onImageLoad(): void {
        this.isLoaded = true;
        this.cardEl?.classList.remove('loading');
        this.cardEl?.classList.add('loaded');
    }

    private showErrorState(): void {
        this.cardEl?.classList.remove('loading');
        this.cardEl?.classList.add('error');
        
        const thumbnailContainer = this.cardEl?.querySelector('.image-thumbnail-container');
        if (thumbnailContainer) {
            thumbnailContainer.empty();
            thumbnailContainer.createEl('div', { 
                cls: 'error-message',
                text: '⚠️ Failed to load'
            });
        }
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private getQualityLevel(score: number): string {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    }

    update(image: ImageItem): void {
        this.image = image;
        
        if (this.cardEl) {
            // Update metadata
            const metaEl = this.cardEl.querySelector('.image-meta');
            if (metaEl && this.plugin.settings.showMetadata) {
                metaEl.empty();
                
                const dimensions = `${this.image.dimensions.width}×${this.image.dimensions.height}`;
                metaEl.createEl('span', { 
                    text: dimensions,
                    cls: 'meta-item meta-dimensions' 
                });
                
                metaEl.createEl('span', { 
                    text: this.formatFileSize(this.image.size),
                    cls: 'meta-item meta-size' 
                });
                
                metaEl.createEl('span', { 
                    text: this.image.format.toUpperCase(),
                    cls: 'meta-item meta-format' 
                });
            }
            
            // Update tags
            const tagsEl = this.cardEl.querySelector('.image-tags');
            if (tagsEl && this.plugin.settings.showTags) {
                tagsEl.empty();
                
                this.image.tags.slice(0, 5).forEach(tag => {
                    const tagEl = tagsEl.createEl('span', {
                        text: tag.name,
                        cls: `tag ${tag.category === 'auto' ? 'tag-auto' : 'tag-manual'}`
                    });
                    
                    if (tag.color) {
                        tagEl.style.setProperty('--tag-color', tag.color);
                    }
                });
                
                if (this.image.tags.length > 5) {
                    tagsEl.createEl('span', {
                        text: `+${this.image.tags.length - 5}`,
                        cls: 'tag tag-more'
                    });
                }
            }
            
            // Update usage indicator
            const usageEl = this.cardEl.querySelector('.usage-indicator');
            if (this.image.relatedNotes.length > 0) {
                if (!usageEl) {
                    const newUsageEl = this.cardEl.createEl('div', { cls: 'usage-indicator' });
                    newUsageEl.createEl('span', { text: this.image.relatedNotes.length.toString() });
                } else {
                    const span = usageEl.querySelector('span');
                    if (span) {
                        span.textContent = this.image.relatedNotes.length.toString();
                    }
                }
            } else if (usageEl) {
                usageEl.remove();
            }
        }
    }

    getElement(): HTMLElement {
        return this.cardEl!;
    }

    isImageLoaded(): boolean {
        return this.isLoaded;
    }
}