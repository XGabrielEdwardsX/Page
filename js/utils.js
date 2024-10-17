// js/utils.js

export async function fetchWithRetry(url, options = {}, retries = 3, backoff = 500) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // Solo reintentar para errores 5xx o errores de red
                if (response.status >= 500) {
                    throw new Error(`Error ${response.status}`);
                }
                // Para otros errores, no reintentar
                return response;
            }
            return response;
        } catch (error) {
            if (attempt < retries - 1) {
                // Esperar antes del siguiente intento (exponential backoff)
                await new Promise(res => setTimeout(res, backoff * Math.pow(2, attempt)));
            } else {
                throw error;
            }
        }
    }
}
