import { App, Modal } from 'obsidian';
import EnhancedGalleryPlugin from '../../main';
import { ImageItem } from '../types/gallery';

export class ImageModal extends Modal {
    private plugin: EnhancedGalleryPlugin;
    private image: ImageItem;

    constructor(app: App, plugin: EnhancedGalleryPlugin, image: ImageItem) {
        super(app);
        this.plugin = plugin;
        this.image = image;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('image-modal');

        // Header
        const header = contentEl.createEl('div', { cls: 'modal-header' });
        header.createEl('h3', { text: this.image.name });
        
        // Image
        const imageContainer = contentEl.createEl('div', { cls: 'modal-image-container' });
        const img = imageContainer.createEl('img', {
            cls: 'modal-image',
            attr: {
                src: this.image.path,
                alt: this.image.name
            }
        });
        
        // Metadata
        const metadata = contentEl.createEl('div', { cls: 'modal-metadata' });
        metadata.createEl('p', { text: `Dimensions: ${this.image.dimensions.width}×${this.image.dimensions.height}` });
        metadata.createEl('p', { text: `Size: ${this.formatFileSize(this.image.size)}` });
        metadata.createEl('p', { text: `Format: ${this.image.format.toUpperCase()}` });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}