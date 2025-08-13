import { App } from 'obsidian';
import { GallerySettings } from '../types/settings';
import { ImageItem, SearchQuery, GalleryFilter } from '../types/gallery';

export class SearchEngine {
    private app: App;
    private settings: GallerySettings;
    private index: Map<string, ImageItem> = new Map();
    private searchIndex: Map<string, Set<string>> = new Map();

    constructor(app: App, settings: GallerySettings) {
        this.app = app;
        this.settings = settings;
    }

    async buildIndex(images: ImageItem[]): Promise<void> {
        this.index.clear();
        this.searchIndex.clear();

        for (const image of images) {
            this.index.set(image.path, image);
            this.indexImage(image);
        }
    }

    private indexImage(image: ImageItem): void {
        const searchTerms = new Set<string>();
        
        // Index filename
        const nameTerms = image.name.toLowerCase().split(/[^a-zA-Z0-9]/);
        nameTerms.forEach(term => {
            if (term.length > 0) {
                searchTerms.add(term);
            }
        });

        // Index path
        const pathTerms = image.path.toLowerCase().split(/[^a-zA-Z0-9]/);
        pathTerms.forEach(term => {
            if (term.length > 0) {
                searchTerms.add(term);
            }
        });

        // Index tags
        image.tags.forEach(tag => {
            searchTerms.add(tag.name.toLowerCase());
        });

        // Index format
        searchTerms.add(image.format.toLowerCase());

        // Store in search index
        searchTerms.forEach(term => {
            if (!this.searchIndex.has(term)) {
                this.searchIndex.set(term, new Set());
            }
            this.searchIndex.get(term)!.add(image.path);
        });
    }

    async search(filter: Partial<GalleryFilter>): Promise<ImageItem[]> {
        let results = Array.from(this.index.values());

        // Apply text search
        if (filter.searchText) {
            const matchingPaths = this.searchByText(filter.searchText);
            results = results.filter(img => matchingPaths.has(img.path));
        }

        // Apply other filters
        if (filter.selectedTags && filter.selectedTags.length > 0) {
            results = results.filter(img =>
                filter.selectedTags!.some(tagName =>
                    img.tags.some(tag => tag.name === tagName)
                )
            );
        }

        if (filter.fileTypes && filter.fileTypes.length > 0) {
            results = results.filter(img =>
                filter.fileTypes!.includes(img.format.toLowerCase())
            );
        }

        if (filter.hasNotes !== undefined) {
            results = results.filter(img =>
                filter.hasNotes ? img.relatedNotes.length > 0 : img.relatedNotes.length === 0
            );
        }

        return results;
    }

    private searchByText(query: string): Set<string> {
        const matchingPaths = new Set<string>();
        const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

        for (const term of queryTerms) {
            // Exact matches
            const exactMatches = this.searchIndex.get(term);
            if (exactMatches) {
                exactMatches.forEach(path => matchingPaths.add(path));
            }

            // Partial matches
            for (const [indexTerm, paths] of this.searchIndex) {
                if (indexTerm.includes(term)) {
                    paths.forEach(path => matchingPaths.add(path));
                }
            }
        }

        return matchingPaths;
    }

    updateImageInIndex(image: ImageItem): void {
        this.index.set(image.path, image);
        
        // Remove old index entries for this image
        for (const [term, paths] of this.searchIndex) {
            paths.delete(image.path);
            if (paths.size === 0) {
                this.searchIndex.delete(term);
            }
        }

        // Re-index the image
        this.indexImage(image);
    }

    removeImageFromIndex(imagePath: string): void {
        this.index.delete(imagePath);
        
        // Remove from search index
        for (const [term, paths] of this.searchIndex) {
            paths.delete(imagePath);
            if (paths.size === 0) {
                this.searchIndex.delete(term);
            }
        }
    }

    getIndexSize(): number {
        return this.index.size;
    }

    clearIndex(): void {
        this.index.clear();
        this.searchIndex.clear();
    }
}