// app/components/DemoImages.tsx
'use client';

const DEMO_IMAGES = [
    { name: '🍔 Burger', url: '/demo/burger.jpg' },
    { name: '🥗 Salad', url: '/demo/salad.jpg' },
    { name: '🍱 Bento', url: '/demo/bento.jpg' },
];

export default function DemoImages({ onSelect }: { onSelect: (url: string) => void }) {
    return (
        <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2 text-center">
                💡 Don&apos;t have a photo? Try a demo:
            </p>
            <div className="flex gap-2 justify-center">
                {DEMO_IMAGES.map(img => (
                    <button
                        key={img.url}
                        onClick={async () => {
                            // 加载图片并转 base64
                            const resp = await fetch(img.url);
                            const blob = await resp.blob();
                            const reader = new FileReader();
                            reader.onloadend = () => onSelect(reader.result as string);
                            reader.readAsDataURL(blob);
                        }}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-blue-50"
                    >
                        {img.name}
                    </button>
                ))}
            </div>
        </div>
    );
}