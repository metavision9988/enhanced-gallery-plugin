import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { GalleryView, VIEW_TYPE_GALLERY } from './src/views/GalleryView';
import { GallerySettings, DEFAULT_SETTINGS } from './src/types/settings';
import { ImageScanner } from './src/features/ImageScanner';
import { ThumbnailGenerator } from './src/utils/thumbnailUtils';
import { TagManager } from './src/features/TagManager';
import { SearchEngine } from './src/features/SearchEngine';

export default class EnhancedGalleryPlugin extends Plugin {
    settings: GallerySettings;
    imageScanner: ImageScanner;
    thumbnailGenerator: ThumbnailGenerator;
    tagManager: TagManager;
    searchEngine: SearchEngine;

    async onload() {
        await this.loadSettings();

        // Initialize core services
        this.imageScanner = new ImageScanner(this.app, this.settings);
        this.thumbnailGenerator = new ThumbnailGenerator(this.app, this.settings);
        this.tagManager = new TagManager(this.app, this.settings);
        this.searchEngine = new SearchEngine(this.app, this.settings);

        // Register the gallery view
        this.registerView(
            VIEW_TYPE_GALLERY,
            (leaf) => new GalleryView(leaf, this)
        );

        // Add ribbon icon
        const ribbonIconEl = this.addRibbonIcon(
            'image',
            'Enhanced Gallery',
            (evt: MouseEvent) => {
                this.activateView();
            }
        );
        ribbonIconEl.addClass('enhanced-gallery-ribbon-icon');

        // Add command to open gallery
        this.addCommand({
            id: 'open-enhanced-gallery',
            name: 'Open Enhanced Gallery',
            callback: () => {
                this.activateView();
            }
        });

        // Add command to scan images
        this.addCommand({
            id: 'scan-vault-images',
            name: 'Scan vault for images',
            callback: async () => {
                new Notice('Scanning vault for images...');
                const images = await this.imageScanner.scanVault();
                new Notice(`Found ${images.length} images`);
            }
        });

        // Add command to generate thumbnails
        this.addCommand({
            id: 'generate-thumbnails',
            name: 'Generate thumbnails for all images',
            callback: async () => {
                new Notice('Generating thumbnails...');
                const images = await this.imageScanner.scanVault();
                let generated = 0;
                for (const image of images) {
                    try {
                        await this.thumbnailGenerator.generateThumbnail(image.path);
                        generated++;
                    } catch (error) {
                        console.error(`Failed to generate thumbnail for ${image.path}:`, error);
                    }
                }
                new Notice(`Generated ${generated} thumbnails`);
            }
        });

        // Add command to analyze images with AI
        this.addCommand({
            id: 'analyze-images-ai',
            name: 'Analyze images with AI',
            checkCallback: (checking: boolean) => {
                if (this.settings.enableAIAnalysis && this.settings.aiApiKey) {
                    if (!checking) {
                        this.analyzeImagesWithAI();
                    }
                    return true;
                }
                return false;
            }
        });

        // Add settings tab
        this.addSettingTab(new GallerySettingTab(this.app, this));

        // Initialize on startup if enabled
        if (this.settings.aiAnalysisOnStartup) {
            this.app.workspace.onLayoutReady(async () => {
                await this.initializeGallery();
            });
        }
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_GALLERY);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_GALLERY);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: VIEW_TYPE_GALLERY, active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async initializeGallery() {
        new Notice('Initializing Enhanced Gallery...');
        
        // Scan for images
        const images = await this.imageScanner.scanVault();
        
        // Build search index
        await this.searchEngine.buildIndex(images);
        
        // Generate thumbnails in background
        if (this.settings.cacheThumbnails) {
            this.generateThumbnailsInBackground(images);
        }
        
        new Notice(`Gallery initialized with ${images.length} images`);
    }

    async generateThumbnailsInBackground(images: any[]) {
        for (const image of images) {
            try {
                const exists = await this.thumbnailGenerator.thumbnailExists(image.path);
                if (!exists) {
                    await this.thumbnailGenerator.generateThumbnail(image.path);
                }
            } catch (error) {
                console.error(`Failed to generate thumbnail for ${image.path}:`, error);
            }
        }
    }

    async analyzeImagesWithAI() {
        new Notice('Starting AI analysis of images...');
        
        const images = await this.imageScanner.scanVault();
        let analyzed = 0;
        
        for (const image of images) {
            try {
                // This will be implemented when we add the AI layer
                // const analysis = await this.aiAnalyzer.analyzeImage(image.path);
                // await this.tagManager.applyAITags(image.path, analysis.tags);
                analyzed++;
            } catch (error) {
                console.error(`Failed to analyze ${image.path}:`, error);
            }
        }
        
        new Notice(`AI analysis complete: ${analyzed} images processed`);
    }
}

class GallerySettingTab extends PluginSettingTab {
    plugin: EnhancedGalleryPlugin;

    constructor(app: App, plugin: EnhancedGalleryPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Enhanced Gallery Settings' });

        // View Settings
        containerEl.createEl('h3', { text: 'View Settings' });

        new Setting(containerEl)
            .setName('Default view mode')
            .setDesc('Choose the default gallery view mode')
            .addDropdown(dropdown => dropdown
                .addOption('grid', 'Grid')
                .addOption('list', 'List')
                .addOption('slide', 'Slideshow')
                .setValue(this.plugin.settings.defaultViewMode)
                .onChange(async (value: 'grid' | 'list' | 'slide') => {
                    this.plugin.settings.defaultViewMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Thumbnail size')
            .setDesc('Size of thumbnails in gallery view')
            .addDropdown(dropdown => dropdown
                .addOption('small', 'Small (150px)')
                .addOption('medium', 'Medium (250px)')
                .addOption('large', 'Large (400px)')
                .setValue(this.plugin.settings.thumbnailSize)
                .onChange(async (value: 'small' | 'medium' | 'large') => {
                    this.plugin.settings.thumbnailSize = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Grid columns')
            .setDesc('Number of columns in grid view')
            .addSlider(slider => slider
                .setLimits(2, 8, 1)
                .setValue(this.plugin.settings.gridColumns)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.gridColumns = value;
                    await this.plugin.saveSettings();
                }));

        // AI Settings
        containerEl.createEl('h3', { text: 'AI Features' });

        new Setting(containerEl)
            .setName('Enable AI analysis')
            .setDesc('Use AI to analyze and tag images automatically')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAIAnalysis)
                .onChange(async (value) => {
                    this.plugin.settings.enableAIAnalysis = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('AI provider')
            .setDesc('Choose your AI service provider')
            .addDropdown(dropdown => dropdown
                .addOption('none', 'None')
                .addOption('openai', 'OpenAI')
                .addOption('claude', 'Claude')
                .addOption('local', 'Local Model')
                .setValue(this.plugin.settings.aiProvider)
                .onChange(async (value: 'openai' | 'claude' | 'local' | 'none') => {
                    this.plugin.settings.aiProvider = value;
                    await this.plugin.saveSettings();
                }));

        if (this.plugin.settings.aiProvider !== 'none' && this.plugin.settings.aiProvider !== 'local') {
            new Setting(containerEl)
                .setName('API Key')
                .setDesc('Enter your API key for the selected AI provider')
                .addText(text => text
                    .setPlaceholder('Enter API key')
                    .setValue(this.plugin.settings.aiApiKey || '')
                    .onChange(async (value) => {
                        this.plugin.settings.aiApiKey = value;
                        await this.plugin.saveSettings();
                    })
                    .inputEl.type = 'password');
        }

        new Setting(containerEl)
            .setName('Auto-tagging')
            .setDesc('Automatically generate tags for new images')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoTagging)
                .onChange(async (value) => {
                    this.plugin.settings.autoTagging = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Duplicate detection')
            .setDesc('Automatically detect and highlight duplicate images')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.duplicateDetection)
                .onChange(async (value) => {
                    this.plugin.settings.duplicateDetection = value;
                    await this.plugin.saveSettings();
                }));

        // Performance Settings
        containerEl.createEl('h3', { text: 'Performance' });

        new Setting(containerEl)
            .setName('Cache thumbnails')
            .setDesc('Store generated thumbnails for faster loading')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cacheThumbnails)
                .onChange(async (value) => {
                    this.plugin.settings.cacheThumbnails = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Lazy loading')
            .setDesc('Load images as they become visible')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.lazyLoading)
                .onChange(async (value) => {
                    this.plugin.settings.lazyLoading = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Images per page')
            .setDesc('Number of images to load at once')
            .addSlider(slider => slider
                .setLimits(10, 200, 10)
                .setValue(this.plugin.settings.imagesPerPage)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.imagesPerPage = value;
                    await this.plugin.saveSettings();
                }));

        // Advanced Settings
        containerEl.createEl('h3', { text: 'Advanced' });

        new Setting(containerEl)
            .setName('Extract EXIF data')
            .setDesc('Read and display image metadata')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.exifExtraction)
                .onChange(async (value) => {
                    this.plugin.settings.exifExtraction = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Color analysis')
            .setDesc('Extract dominant colors from images')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.colorAnalysis)
                .onChange(async (value) => {
                    this.plugin.settings.colorAnalysis = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Excluded folders')
            .setDesc('Comma-separated list of folders to exclude from scanning')
            .addTextArea(text => text
                .setPlaceholder('.obsidian, .trash')
                .setValue(this.plugin.settings.excludedFolders.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.excludedFolders = value.split(',').map(f => f.trim());
                    await this.plugin.saveSettings();
                }));
    }
}