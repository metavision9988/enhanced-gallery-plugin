export interface GallerySettings {
    // View settings
    defaultViewMode: 'grid' | 'list' | 'slide';
    thumbnailSize: 'small' | 'medium' | 'large';
    gridColumns: number;
    showMetadata: boolean;
    showTags: boolean;
    
    // AI features
    enableAIAnalysis: boolean;
    aiProvider: 'openai' | 'claude' | 'local' | 'none';
    aiApiKey?: string;
    autoTagging: boolean;
    duplicateDetection: boolean;
    aiAnalysisOnStartup: boolean;
    
    // Performance settings
    maxThumbnailSize: number;
    cacheThumbnails: boolean;
    lazyLoading: boolean;
    imagesPerPage: number;
    enableInfiniteScroll: boolean;
    
    // Filtering
    supportedFormats: string[];
    excludedFolders: string[];
    minFileSize: number;
    maxFileSize: number;
    
    // Advanced settings
    exifExtraction: boolean;
    colorAnalysis: boolean;
    qualityAssessment: boolean;
    enableSimilaritySearch: boolean;
    hashingAlgorithm: 'perceptual' | 'average' | 'difference';
    
    // UI settings
    theme: 'light' | 'dark' | 'auto';
    showSidebar: boolean;
    sidebarPosition: 'left' | 'right';
    enableKeyboardShortcuts: boolean;
    
    // Storage settings
    thumbnailCachePath: string;
    aiCacheDuration: number; // in days
    maxCacheSize: number; // in MB
}

export const DEFAULT_SETTINGS: GallerySettings = {
    // View settings
    defaultViewMode: 'grid',
    thumbnailSize: 'medium',
    gridColumns: 4,
    showMetadata: true,
    showTags: true,
    
    // AI features
    enableAIAnalysis: false,
    aiProvider: 'none',
    autoTagging: true,
    duplicateDetection: true,
    aiAnalysisOnStartup: false,
    
    // Performance settings
    maxThumbnailSize: 400,
    cacheThumbnails: true,
    lazyLoading: true,
    imagesPerPage: 50,
    enableInfiniteScroll: true,
    
    // Filtering
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
    excludedFolders: ['.obsidian', '.trash', 'node_modules'],
    minFileSize: 1024, // 1KB
    maxFileSize: 50 * 1024 * 1024, // 50MB
    
    // Advanced settings
    exifExtraction: true,
    colorAnalysis: true,
    qualityAssessment: true,
    enableSimilaritySearch: true,
    hashingAlgorithm: 'perceptual',
    
    // UI settings
    theme: 'auto',
    showSidebar: true,
    sidebarPosition: 'left',
    enableKeyboardShortcuts: true,
    
    // Storage settings
    thumbnailCachePath: '.obsidian/plugins/enhanced-gallery/thumbnails',
    aiCacheDuration: 7,
    maxCacheSize: 100
};