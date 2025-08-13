import { App } from 'obsidian';
import { GallerySettings } from '../types/settings';
import { ExifData } from '../types/gallery';

export class MetadataExtractor {
    private app: App;
    private settings: GallerySettings;

    constructor(app: App, settings: GallerySettings) {
        this.app = app;
        this.settings = settings;
    }

    async extractExifData(arrayBuffer: ArrayBuffer, extension: string): Promise<ExifData | undefined> {
        if (!this.settings.exifExtraction) {
            return undefined;
        }

        try {
            // For JPEG files, we can extract EXIF data
            if (extension.toLowerCase() === 'jpg' || extension.toLowerCase() === 'jpeg') {
                return this.extractJpegExif(arrayBuffer);
            }
            
            // For other formats, we might have limited metadata
            return undefined;
        } catch (error) {
            console.error('Failed to extract EXIF data:', error);
            return undefined;
        }
    }

    private extractJpegExif(arrayBuffer: ArrayBuffer): ExifData | undefined {
        const dataView = new DataView(arrayBuffer);
        
        // Check for JPEG signature
        if (dataView.getUint16(0) !== 0xFFD8) {
            return undefined;
        }

        let offset = 2;
        const length = dataView.byteLength;
        const exifData: ExifData = {};

        try {
            // Look for APP1 marker (EXIF)
            while (offset < length) {
                const marker = dataView.getUint16(offset);
                
                if (marker === 0xFFE1) { // APP1 marker
                    const segmentLength = dataView.getUint16(offset + 2);
                    
                    // Check for "Exif\0\0" identifier
                    if (dataView.getUint32(offset + 4) === 0x45786966 && 
                        dataView.getUint16(offset + 8) === 0x0000) {
                        
                        // Parse TIFF header
                        const tiffOffset = offset + 10;
                        const byteOrder = dataView.getUint16(tiffOffset);
                        const littleEndian = byteOrder === 0x4949;
                        
                        // Parse IFD (Image File Directory)
                        const ifdOffset = tiffOffset + this.getUint32(dataView, tiffOffset + 4, littleEndian);
                        this.parseIFD(dataView, ifdOffset, littleEndian, exifData, tiffOffset);
                        
                        break;
                    }
                }
                
                offset += 2 + dataView.getUint16(offset + 2);
            }
        } catch (error) {
            console.error('Error parsing EXIF data:', error);
        }

        return Object.keys(exifData).length > 0 ? exifData : undefined;
    }

    private parseIFD(dataView: DataView, offset: number, littleEndian: boolean, exifData: ExifData, tiffOffset: number): void {
        const numEntries = this.getUint16(dataView, offset, littleEndian);
        let entryOffset = offset + 2;

        const tagMap: { [key: number]: string } = {
            0x010F: 'make',
            0x0110: 'model',
            0x0132: 'dateTime',
            0x829A: 'exposureTime',
            0x829D: 'fNumber',
            0x8827: 'iso',
            0x920A: 'focalLength',
            0x9209: 'flash',
            0x0112: 'orientation'
        };

        for (let i = 0; i < numEntries; i++) {
            const tag = this.getUint16(dataView, entryOffset, littleEndian);
            const type = this.getUint16(dataView, entryOffset + 2, littleEndian);
            const count = this.getUint32(dataView, entryOffset + 4, littleEndian);
            const valueOffset = entryOffset + 8;

            if (tagMap[tag]) {
                const value = this.getValue(dataView, type, count, valueOffset, littleEndian, tiffOffset);
                if (value !== null) {
                    (exifData as any)[tagMap[tag]] = value;
                }
            }

            entryOffset += 12;
        }
    }

    private getValue(dataView: DataView, type: number, count: number, valueOffset: number, littleEndian: boolean, tiffOffset: number): any {
        let actualOffset = valueOffset;
        
        // If value is larger than 4 bytes, it's stored at the offset
        const valueSize = this.getTypeSize(type) * count;
        if (valueSize > 4) {
            actualOffset = tiffOffset + this.getUint32(dataView, valueOffset, littleEndian);
        }

        switch (type) {
            case 1: // BYTE
                return dataView.getUint8(actualOffset);
            case 2: // ASCII
                let str = '';
                for (let i = 0; i < count - 1; i++) {
                    str += String.fromCharCode(dataView.getUint8(actualOffset + i));
                }
                return str;
            case 3: // SHORT
                return this.getUint16(dataView, actualOffset, littleEndian);
            case 4: // LONG
                return this.getUint32(dataView, actualOffset, littleEndian);
            case 5: // RATIONAL
                const numerator = this.getUint32(dataView, actualOffset, littleEndian);
                const denominator = this.getUint32(dataView, actualOffset + 4, littleEndian);
                return denominator !== 0 ? numerator / denominator : 0;
            default:
                return null;
        }
    }

    private getTypeSize(type: number): number {
        const sizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
        return sizes[type] || 0;
    }

    private getUint16(dataView: DataView, offset: number, littleEndian: boolean): number {
        return dataView.getUint16(offset, littleEndian);
    }

    private getUint32(dataView: DataView, offset: number, littleEndian: boolean): number {
        return dataView.getUint32(offset, littleEndian);
    }
}