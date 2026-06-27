/**
 * Resolves an image filename (or full path) to a complete URL.
 * After the store-wise image migration, images are stored as bare filenames in the DB.
 * This function constructs the full path; if the value is already a full path (starts with '/'),
 * it is returned unchanged for backward compatibility.
 *
 * @param {string} filename  - stored value (e.g. "logo_abc.jpg" or "/images/store/logo_abc.jpg")
 * @param {string} storeId   - the store's ObjectID hex string
 * @param {string} category  - directory name under the store folder (e.g. "store", "signatures", "products")
 * @param {string} [entityId] - optional sub-directory (e.g. product ID or vendor ID)
 */
export function resolveImageUrl(filename, storeId, category, entityId = null) {
    if (!filename) return filename;
    if (filename.startsWith('/')) {
        // Rewrite legacy paths like /images/store/logo_xxx.jpg -> /images/{storeId}/store/logo_xxx.jpg
        if (storeId && filename.startsWith('/images/store/')) {
            const basename = filename.split('/').pop().split('?')[0];
            return `/images/${storeId}/store/${basename}`;
        }
        return filename;
    }
    if (!storeId) return filename;                 // no store context, can't build URL
    if (entityId) {
        return `/images/${storeId}/${category}/${entityId}/${filename}`;
    }
    return `/images/${storeId}/${category}/${filename}`;
}
