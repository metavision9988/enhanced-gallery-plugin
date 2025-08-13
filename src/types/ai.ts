export interface VisionAnalysisResult {
    tags: string[];
    description: string;
    objects: DetectedObject[];
    colors: string[];
    quality: { score: number; issues: string[] };
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

export interface AIProvider {
    name: string;
    analyzeImage(imagePath: string): Promise<VisionAnalysisResult>;
    generateDescription(imagePath: string): Promise<string>;
    detectObjects(imagePath: string): Promise<DetectedObject[]>;
    extractColors(imagePath: string): Promise<string[]>;
    assessQuality(imagePath: string): Promise<{ score: number; issues: string[] }>;
}

export interface OpenAIConfig {
    apiKey: string;
    model: 'gpt-4-vision-preview' | 'gpt-4-turbo';
    maxTokens: number;
    temperature: number;
}

export interface ClaudeConfig {
    apiKey: string;
    model: 'claude-3-opus' | 'claude-3-sonnet';
    maxTokens: number;
}

export interface LocalAIConfig {
    endpoint: string;
    model: string;
    timeout: number;
}

export interface AIAnalysisCache {
    imagePath: string;
    timestamp: Date;
    result: VisionAnalysisResult;
    provider: string;
    version: string;
}

export interface SimilarityResult {
    imagePath: string;
    similarity: number;
    method: 'perceptual' | 'structural' | 'color' | 'content';
}

export interface DuplicateGroup {
    hash: string;
    images: string[];
    similarity: number;
    suggestedAction: 'keep_all' | 'keep_best' | 'manual_review';
}