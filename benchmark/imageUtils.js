export function compressImageFileToDataUrl(file, maxDimension = 640, quality = 0.72) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            reject(new Error('Invalid image file'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas unsupported'));
                    return;
                }

                let { width, height } = img;
                const aspectRatio = width / height;
                if (width > maxDimension || height > maxDimension) {
                    if (aspectRatio > 1) {
                        width = maxDimension;
                        height = Math.round(maxDimension / aspectRatio);
                    } else {
                        height = maxDimension;
                        width = Math.round(maxDimension * aspectRatio);
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('Image decode failed'));
            img.src = evt.target.result;
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}