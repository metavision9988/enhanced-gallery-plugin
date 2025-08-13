export interface ImageTag {
    id: string;
    name: string;
    color: string;
    category: 'auto' | 'manual';
    confidence?: number;
}

export interface ImageItem {
    path: string;
    name: string;
    size: number;
    dimensions: { width: number; height: number };
    format: string;
    dateCreated: Date;
    dateModified: Date;
    thumbnailPath?: string;
    
    tags: ImageTag[];
    description?: string;
    exifData?: ExifData;
    customMetadata: Record<string, any>;
    
    analysis?: ImageAnalysis;
    
    usageCount: number;
    lastUsed?: Date;
    relatedNotes: string[];
}

export interface ImageAnalysis {
    tags: string[];
    description: string;
    objects: DetectedObject[];
    colors: ColorPalette;
    quality: ImageQuality;
    similar: string[];
}

export interface DetectedObject {
    name: string;
    confidence: number;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface ColorPalette {
    dominant: string;
    palette: string[];
    histogram?: Record<string, number>;
}

export interface ImageQuality {
    score: number;
    issues: string[];
    resolution: 'low' | 'medium' | 'high' | 'ultra';
    sharpness: number;
    brightness: number;
    contrast: number;
}

export interface ExifData {
    make?: string;
    model?: string;
    dateTime?: string;
    exposureTime?: string;
    fNumber?: number;
    iso?: number;
    focalLength?: number;
    flash?: boolean;
    orientation?: number;
    gps?: {
        latitude: number;
        longitude: number;
        altitude?: number;
    };
}

export interface GalleryFilter {
    searchText?: string;
    selectedTags?: string[];
    categories?: string[];
    dateRange?: { start: Date; end: Date };
    fileTypes?: string[];
    sizeRange?: { min: number; max: number };
    qualityRange?: { min: number; max: number };
    hasNotes?: boolean;
    sortBy: 'name' | 'date' | 'size' | 'usage' | 'quality';
    sortOrder: 'asc' | 'desc';
}

export interface SearchQuery {
    text?: string;
    tags?: string[];
    dateRange?: { start: Date; end: Date };
    fileType?: string[];
    sizeRange?: { min: number; max: number };
    category?: string;
}

export interface ImageUsageStats {
    imagePath: string;
    totalUsage: number;
    lastUsed: Date;
    contexts: Record<string, number>;
}

export interface TagStatistics {
    tagName: string;
    count: number;
    category: 'auto' | 'manual';
    averageConfidence?: number;
    relatedTags: string[];
}

export type ViewMode = 'grid' | 'list' | 'slide';

export interface GalleryState {
    currentView: ViewMode;
    currentFilter: GalleryFilter;
    selectedImages: string[];
    isLoading: boolean;
    error?: string;
}