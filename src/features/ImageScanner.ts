import { App, TFile, TFolder, Vault } from 'obsidian';
import { ImageItem, ExifData } from '../types/gallery';
import { GallerySettings } from '../types/settings';
import { MetadataExtractor } from './MetadataExtractor';

export class ImageScanner {
    private app: App;
    private settings: GallerySettings;
    private metadataExtractor: MetadataExtractor;
    private imageCache: Map<string, ImageItem> = new Map();

    constructor(app: App, settings: GallerySettings) {
        this.app = app;
        this.settings = settings;
        this.metadataExtractor = new MetadataExtractor(app, settings);
    }

    async scanVault(): Promise<ImageItem[]> {
        const images: ImageItem[] = [];
        const files = this.app.vault.getFiles();
        
        for (const file of files) {
            if (this.isImageFile(file) && !this.isExcluded(file)) {
                try {
                    const imageItem = await this.createImageItem(file);
                    images.push(imageItem);
                    this.imageCache.set(file.path, imageItem);
                } catch (error) {
                    console.error(`Failed to process image ${file.path}:`, error);
                }
            }
        }
        
        return images;
    }

    async scanFolder(folder: TFolder): Promise<ImageItem[]> {
        const images: ImageItem[] = [];
        
        for (const child of folder.children) {
            if (child instanceof TFile) {
                if (this.isImageFile(child) && !this.isExcluded(child)) {
                    try {
                        const imageItem = await this.createImageItem(child);
                        images.push(imageItem);
                        this.imageCache.set(child.path, imageItem);
                    } catch (error) {
                        console.error(`Failed to process image ${child.path}:`, error);
                    }
                }
            } else if (child instanceof TFolder && !this.isExcludedFolder(child.path)) {
                const folderImages = await this.scanFolder(child);
                images.push(...folderImages);
            }
        }
        
        return images;
    }

    async rescanImage(path: string): Promise<ImageItem | null> {
        const file = this.app.vault.getAbstractFileByPath(path);
        
        if (file instanceof TFile && this.isImageFile(file)) {
            try {
                const imageItem = await this.createImageItem(file);
                this.imageCache.set(file.path, imageItem);
                return imageItem;
            } catch (error) {
                console.error(`Failed to rescan image ${path}:`, error);
                return null;
            }
        }
        
        return null;
    }

    private async createImageItem(file: TFile): Promise<ImageItem> {
        const stat = await this.app.vault.adapter.stat(file.path);
        const arrayBuffer = await this.app.vault.readBinary(file);
        
        // Get image dimensions
        const dimensions = await this.getImageDimensions(arrayBuffer, file.extension);
        
        // Extract EXIF data if enabled
        let exifData: ExifData | undefined;
        if (this.settings.exifExtraction) {
            exifData = await this.metadataExtractor.extractExifData(arrayBuffer, file.extension);
        }
        
        // Find related notes
        const relatedNotes = await this.findRelatedNotes(file.path);
        
        // Get cached analysis if available
        const cachedAnalysis = await this.getCachedAnalysis(file.path);
        
        const imageItem: ImageItem = {
            path: file.path,
            name: file.name,
            size: stat?.size || 0,
            dimensions,
            format: file.extension.toLowerCase(),
            dateCreated: new Date(stat?.ctime || Date.now()),
            dateModified: new Date(stat?.mtime || Date.now()),
            tags: [],
            customMetadata: {},
            exifData,
            analysis: cachedAnalysis,
            usageCount: relatedNotes.length,
            lastUsed: relatedNotes.length > 0 ? new Date() : undefined,
            relatedNotes
        };
        
        return imageItem;
    }

    private async getImageDimensions(
        arrayBuffer: ArrayBuffer,
        extension: string
    ): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const blob = new Blob([arrayBuffer], { type: `image/${extension}` });
            const img = new Image();
            
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
                URL.revokeObjectURL(img.src);
            };
            
            img.onerror = () => {
                console.error('Failed to load image for dimensions');
                resolve({ width: 0, height: 0 });
                URL.revokeObjectURL(img.src);
            };
            
            img.src = URL.createObjectURL(blob);
        });
    }

    private async findRelatedNotes(imagePath: string): Promise<string[]> {
        const relatedNotes: string[] = [];
        const markdownFiles = this.app.vault.getMarkdownFiles();
        
        // Create search patterns for the image
        const fileName = imagePath.split('/').pop() || '';
        const searchPatterns = [
            imagePath,
            `![[${fileName}]]`,
            `![](${imagePath})`,
            encodeURI(imagePath)
        ];
        
        for (const file of markdownFiles) {
            try {
                const content = await this.app.vault.cachedRead(file);
                
                // Check if any pattern matches
                const hasReference = searchPatterns.some(pattern => 
                    content.includes(pattern)
                );
                
                if (hasReference) {
                    relatedNotes.push(file.path);
                }
            } catch (error) {
                console.error(`Failed to read file ${file.path}:`, error);
            }
        }
        
        return relatedNotes;
    }

    private async getCachedAnalysis(imagePath: string): Promise<any> {
        // Check if we have cached AI analysis
        const cacheKey = `ai-analysis-${imagePath}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                const data = JSON.parse(cached);
                const cacheAge = Date.now() - data.timestamp;
                const maxAge = this.settings.aiCacheDuration * 24 * 60 * 60 * 1000; // Convert days to ms
                
                if (cacheAge < maxAge) {
                    return data.analysis;
                }
            } catch (error) {
                console.error('Failed to parse cached analysis:', error);
            }
        }
        
        return undefined;
    }

    private isImageFile(file: TFile): boolean {
        const extension = file.extension.toLowerCase();
        return this.settings.supportedFormats.includes(extension);
    }

    private isExcluded(file: TFile): boolean {
        // Check file size
        const stat = file.stat;
        if (stat) {
            if (stat.size < this.settings.minFileSize || stat.size > this.settings.maxFileSize) {
                return true;
            }
        }
        
        // Check if in excluded folder
        return this.isExcludedFolder(file.path);
    }

    private isExcludedFolder(path: string): boolean {
        return this.settings.excludedFolders.some(folder => 
            path.startsWith(folder) || path.includes(`/${folder}/`)
        );
    }

    getImageFromCache(path: string): ImageItem | undefined {
        return this.imageCache.get(path);
    }

    clearCache(): void {
        this.imageCache.clear();
    }

    getCacheSize(): number {
        return this.imageCache.size;
    }

    async updateImageMetadata(path: string, metadata: Partial<ImageItem>): Promise<void> {
        const cached = this.imageCache.get(path);
        if (cached) {
            Object.assign(cached, metadata);
            this.imageCache.set(path, cached);
        }
    }
}