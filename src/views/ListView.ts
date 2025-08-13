import EnhancedGalleryPlugin from '../../main';
import { ImageItem } from '../types/gallery';

export class ListView {
    private container: HTMLElement;
    private plugin: EnhancedGalleryPlugin;

    constructor(container: HTMLElement, plugin: EnhancedGalleryPlugin) {
        this.container = container;
        this.plugin = plugin;
    }

    render(images: ImageItem[]): void {
        this.container.empty();
        
        const listEl = this.container.createEl('div', { cls: 'gallery-list' });
        
        images.forEach(image => {
            const item = this.createListItem(image);
            listEl.appendChild(item);
        });
    }

    private createListItem(image: ImageItem): HTMLElement {
        const item = createEl('div', { cls: 'gallery-list-item' });
        
        // Thumbnail
        const thumbnail = item.createEl('img', {
            cls: 'list-thumbnail',
            attr: { 
                src: image.path,
                alt: image.name 
            }
        });
        
        // Info section
        const info = item.createEl('div', { cls: 'image-info' });
        info.createEl('h4', { text: image.name });
        info.createEl('p', { 
            text: `${image.dimensions.width}×${image.dimensions.height} | ${this.formatFileSize(image.size)}`
        });
        
        return item;
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}