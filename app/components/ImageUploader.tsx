'use client';

import { useRef, useState } from 'react';

interface ImageUploaderProps {
    onCapture: (imageData: string) => void;
}

export default function ImageUploader({ onCapture }: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageData = reader.result as string;
                setPreview(imageData);
                onCapture(imageData);
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload an image file (JPG, PNG, etc.)');
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">📸 Upload Food Photo</h2>

            {!preview ? (
                <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="text-6xl mb-4">📷</div>
                    <p className="text-gray-600 mb-2">Click or drag & drop to upload a food photo</p>
                    <p className="text-sm text-gray-400">Supported: JPG, PNG, GIF, WebP</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <img src={preview} alt="Food preview" className="w-full rounded-lg shadow-lg" />
                    <button
                        onClick={() => {
                            setPreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        🔄 Upload Another Photo
                    </button>
                </div>
            )}
        </div>
    );
}