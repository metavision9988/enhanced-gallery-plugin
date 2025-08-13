import { App, TFile } from 'obsidian';
import { GallerySettings } from '../types/settings';

export class ThumbnailGenerator {
    private app: App;
    private settings: GallerySettings;

    constructor(app: App, settings: GallerySettings) {
        this.app = app;
        this.settings = settings;
    }

    async generateThumbnail(imagePath: string): Promise<string | null> {
        try {
            const file = this.app.vault.getAbstractFileByPath(imagePath);
            if (!file || !(file instanceof TFile)) {
                return null;
            }

            const arrayBuffer = await this.app.vault.readBinary(file);
            return await this.createThumbnailFromBuffer(arrayBuffer, file.name);
        } catch (error) {
            console.error(`Failed to generate thumbnail for ${imagePath}:`, error);
            return null;
        }
    }

    private async createThumbnailFromBuffer(buffer: ArrayBuffer, filename: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer]);
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                
                const maxSize = this.settings.maxThumbnailSize;
                const { width, height } = this.calculateThumbnailSize(img.width, img.height, maxSize);
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((thumbnailBlob) => {
                    if (thumbnailBlob) {
                        const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
                        resolve(thumbnailUrl);
                    } else {
                        reject(new Error('Failed to create thumbnail blob'));
                    }
                }, 'image/jpeg', 0.8);
                
                URL.revokeObjectURL(img.src);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load image'));
            };
            
            img.src = URL.createObjectURL(blob);
        });
    }

    private calculateThumbnailSize(originalWidth: number, originalHeight: number, maxSize: number) {
        const ratio = Math.min(maxSize / originalWidth, maxSize / originalHeight);
        return {
            width: Math.round(originalWidth * ratio),
            height: Math.round(originalHeight * ratio)
        };
    }

    async thumbnailExists(imagePath: string): Promise<boolean> {
        // For now, thumbnails are generated on-demand
        // In a full implementation, this would check if a cached thumbnail exists
        return false;
    }
}