import { App } from 'obsidian';
import { GallerySettings } from '../types/settings';
import { ImageTag } from '../types/gallery';

export class TagManager {
    private app: App;
    private settings: GallerySettings;
    private tags: Map<string, ImageTag[]> = new Map();

    constructor(app: App, settings: GallerySettings) {
        this.app = app;
        this.settings = settings;
    }

    async addTag(imagePath: string, tag: ImageTag): Promise<void> {
        if (!this.tags.has(imagePath)) {
            this.tags.set(imagePath, []);
        }
        
        const imageTags = this.tags.get(imagePath)!;
        
        // Check if tag already exists
        if (!imageTags.find(t => t.name === tag.name)) {
            imageTags.push(tag);
        }
    }

    async removeTag(imagePath: string, tagId: string): Promise<void> {
        const imageTags = this.tags.get(imagePath);
        if (imageTags) {
            const index = imageTags.findIndex(t => t.id === tagId);
            if (index !== -1) {
                imageTags.splice(index, 1);
            }
        }
    }

    getImageTags(imagePath: string): ImageTag[] {
        return this.tags.get(imagePath) || [];
    }

    getAllTags(): ImageTag[] {
        const allTags: ImageTag[] = [];
        for (const imageTags of this.tags.values()) {
            allTags.push(...imageTags);
        }
        return allTags;
    }

    async applyAITags(imagePath: string, tags: string[]): Promise<void> {
        const aiTags: ImageTag[] = tags.map((tagName, index) => ({
            id: `ai-${imagePath}-${index}`,
            name: tagName,
            color: this.getTagColor(tagName),
            category: 'auto',
            confidence: 0.8 // Default confidence
        }));

        for (const tag of aiTags) {
            await this.addTag(imagePath, tag);
        }
    }

    private getTagColor(tagName: string): string {
        // Simple color mapping based on tag name
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
        ];
        
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
}