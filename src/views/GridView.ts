import { Menu } from 'obsidian';
import EnhancedGalleryPlugin from '../../main';
import { ImageItem } from '../types/gallery';
import { ImageCard } from '../components/ImageCard';
import { ImageModal } from '../components/ImageModal';

export class GridView {
    private container: HTMLElement;
    private plugin: EnhancedGalleryPlugin;
    private gridEl: HTMLElement | null = null;
    private imageCards: Map<string, ImageCard> = new Map();

    constructor(container: HTMLElement, plugin: EnhancedGalleryPlugin) {
        this.container = container;
        this.plugin = plugin;
    }

    render(images: ImageItem[]): void {
        // Clear existing content
        this.clear();
        
        // Create grid container
        this.gridEl = this.container.createEl('div', { cls: 'gallery-grid' });
        
        // Set grid columns based on settings
        this.gridEl.style.setProperty('--grid-columns', this.plugin.settings.gridColumns.toString());
        
        // Render image cards
        images.forEach(image => {
            const card = new ImageCard(this.gridEl!, this.plugin, image);
            card.render();
            
            // Add event handlers
            this.attachCardEvents(card, image);
            
            // Store reference
            this.imageCards.set(image.path, card);
        });
        
        // If no images, show empty state
        if (images.length === 0) {
            this.showEmptyState();
        }
    }

    private attachCardEvents(card: ImageCard, image: ImageItem): void {
        const cardEl = card.getElement();
        
        // Click to open modal
        cardEl.addEventListener('click', (e: MouseEvent) => {
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.openImageModal(image);
            }
        });
        
        // Right-click context menu
        cardEl.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            this.showContextMenu(e, image);
        });
        
        // Double-click to open in default app
        cardEl.addEventListener('dblclick', (e: MouseEvent) => {
            e.preventDefault();
            this.openInDefaultApp(image);
        });
    }

    private openImageModal(image: ImageItem): void {
        const modal = new ImageModal(this.plugin.app, this.plugin, image);
        modal.open();
    }

    private showContextMenu(event: MouseEvent, image: ImageItem): void {
        const menu = new Menu();
        
        menu.addItem((item) =>
            item
                .setTitle('Open image')
                .setIcon('expand')
                .onClick(() => this.openImageModal(image))
        );
        
        menu.addItem((item) =>
            item
                .setTitle('Open in default app')
                .setIcon('external-link')
                .onClick(() => this.openInDefaultApp(image))
        );
        
        menu.addSeparator();
        
        menu.addItem((item) =>
            item
                .setTitle('Copy image path')
                .setIcon('copy')
                .onClick(() => this.copyToClipboard(image.path))
        );
        
        menu.addItem((item) =>
            item
                .setTitle('Copy as markdown link')
                .setIcon('link')
                .onClick(() => this.copyAsMarkdownLink(image))
        );
        
        menu.addItem((item) =>
            item
                .setTitle('Copy as wiki link')
                .setIcon('link-2')
                .onClick(() => this.copyAsWikiLink(image))
        );
        
        menu.addSeparator();
        
        menu.addItem((item) =>
            item
                .setTitle('Show in folder')
                .setIcon('folder')
                .onClick(() => this.showInFolder(image))
        );
        
        menu.addItem((item) =>
            item
                .setTitle('Reveal in navigation')
                .setIcon('file-search')
                .onClick(() => this.revealInNavigation(image))
        );
        
        if (image.relatedNotes.length > 0) {
            menu.addSeparator();
            
            const submenu = menu.addItem((item) =>
                item
                    .setTitle(`Used in ${image.relatedNotes.length} notes`)
                    .setIcon('file-text')
            );
            
            // Add submenu items for related notes
            image.relatedNotes.slice(0, 10).forEach(notePath => {
                // @ts-ignore
                submenu.addItem((item) =>
                    item
                        .setTitle(notePath.split('/').pop() || notePath)
                        .onClick(() => this.openNote(notePath))
                );
            });
            
            if (image.relatedNotes.length > 10) {
                // @ts-ignore
                submenu.addItem((item) =>
                    item
                        .setTitle(`... and ${image.relatedNotes.length - 10} more`)
                        .setDisabled(true)
                );
            }
        }
        
        if (this.plugin.settings.enableAIAnalysis) {
            menu.addSeparator();
            
            menu.addItem((item) =>
                item
                    .setTitle('Analyze with AI')
                    .setIcon('sparkles')
                    .onClick(() => this.analyzeWithAI(image))
            );
            
            menu.addItem((item) =>
                item
                    .setTitle('Generate tags')
                    .setIcon('tag')
                    .onClick(() => this.generateTags(image))
            );
        }
        
        menu.addSeparator();
        
        menu.addItem((item) =>
            item
                .setTitle('Delete image')
                .setIcon('trash')
                .onClick(() => this.deleteImage(image))
        );
        
        menu.showAtMouseEvent(event);
    }

    private async openInDefaultApp(image: ImageItem): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(image.path);
        if (file) {
            // @ts-ignore
            await this.plugin.app.openWithDefaultApp(file.path);
        }
    }

    private copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text);
        // @ts-ignore
        new Notice('Path copied to clipboard');
    }

    private copyAsMarkdownLink(image: ImageItem): void {
        const link = `![${image.name}](${encodeURI(image.path)})`;
        navigator.clipboard.writeText(link);
        // @ts-ignore
        new Notice('Markdown link copied to clipboard');
    }

    private copyAsWikiLink(image: ImageItem): void {
        const link = `![[${image.path}]]`;
        navigator.clipboard.writeText(link);
        // @ts-ignore
        new Notice('Wiki link copied to clipboard');
    }

    private showInFolder(image: ImageItem): void {
        const file = this.plugin.app.vault.getAbstractFileByPath(image.path);
        if (file) {
            // @ts-ignore
            this.plugin.app.showInFolder(file.path);
        }
    }

    private revealInNavigation(image: ImageItem): void {
        const file = this.plugin.app.vault.getAbstractFileByPath(image.path);
        if (file) {
            // @ts-ignore
            const leaf = this.plugin.app.workspace.getLeaf();
            // @ts-ignore
            leaf.openFile(file);
        }
    }

    private async openNote(notePath: string): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
        if (file) {
            await this.plugin.app.workspace.getLeaf().openFile(file as any);
        }
    }

    private async analyzeWithAI(image: ImageItem): Promise<void> {
        // This will be implemented when AI integration is added
        // @ts-ignore
        new Notice('AI analysis will be available soon');
    }

    private async generateTags(image: ImageItem): Promise<void> {
        // This will be implemented when AI integration is added
        // @ts-ignore
        new Notice('Tag generation will be available soon');
    }

    private async deleteImage(image: ImageItem): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(image.path);
        if (file) {
            const confirmed = await this.confirmDeletion(image);
            if (confirmed) {
                await this.plugin.app.vault.delete(file as any);
                // @ts-ignore
                new Notice('Image deleted');
                
                // Remove from view
                const card = this.imageCards.get(image.path);
                if (card) {
                    card.getElement().remove();
                    this.imageCards.delete(image.path);
                }
            }
        }
    }

    private async confirmDeletion(image: ImageItem): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = this.plugin.app.workspace.activeLeaf?.view.containerEl.createEl('div', {
                cls: 'modal-container'
            });
            
            if (!modal) {
                resolve(false);
                return;
            }
            
            const content = modal.createEl('div', { cls: 'modal-content' });
            content.createEl('h3', { text: 'Delete Image?' });
            content.createEl('p', { 
                text: `Are you sure you want to delete "${image.name}"?` 
            });
            
            if (image.relatedNotes.length > 0) {
                content.createEl('p', {
                    text: `Warning: This image is used in ${image.relatedNotes.length} notes.`,
                    cls: 'warning-text'
                });
            }
            
            const buttons = content.createEl('div', { cls: 'modal-buttons' });
            
            const cancelBtn = buttons.createEl('button', { text: 'Cancel' });
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            const deleteBtn = buttons.createEl('button', { 
                text: 'Delete',
                cls: 'mod-warning'
            });
            deleteBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
        });
    }

    private showEmptyState(): void {
        const emptyState = this.container.createEl('div', { cls: 'gallery-empty-state' });
        emptyState.createEl('div', { cls: 'empty-icon', text: '🖼️' });
        emptyState.createEl('h3', { text: 'No images found' });
        emptyState.createEl('p', { text: 'Try adjusting your filters or adding images to your vault.' });
    }

    clear(): void {
        this.container.empty();
        this.imageCards.clear();
        this.gridEl = null;
    }

    updateCard(imagePath: string, image: ImageItem): void {
        const card = this.imageCards.get(imagePath);
        if (card) {
            card.update(image);
        }
    }

    removeCard(imagePath: string): void {
        const card = this.imageCards.get(imagePath);
        if (card) {
            card.getElement().remove();
            this.imageCards.delete(imagePath);
        }
    }
}