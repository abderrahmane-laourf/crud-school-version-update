// api.js

// Adresse de base de l'API
const API_BASE_URL = 'http://localhost:3000'; // Ou l'adresse de votre propre API

// Helper function for consistent error handling with potential JSON body
async function handleResponse(response) {
    if (!response.ok) {
        let errorMessage = `Erreur HTTP ! statut : ${response.status}`;
        // Try to parse the response body for a more specific error message
        try {
            // Use .json() only if there's a body (avoid error on 204)
            if (response.status !== 204 && response.headers.get("content-type")?.includes("application/json")) {
                 const errorData = await response.json();
                 // Use message from API if available, otherwise stick to HTTP status
                 errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (response.status !== 204) {
                // Try getting text if not JSON and not No Content
                 const errorText = await response.text();
                 if (errorText) {
                    errorMessage += ` - ${errorText}`;
                 }
            }
        } catch (e) {
            // Ignore if parsing json/text fails after an error response
             console.error("Failed to parse error response body:", e);
        }
        // *** HADI KAT THROWI L'ERREUR B MESSAGE MEZYAN ***
        throw new Error(errorMessage);
    }

    // Handle 204 No Content specifically - return an indicator of success rather than trying to parse JSON
    if (response.status === 204) {
        return { success: true }; // Indicate success for DELETE or successful PUT with no body
    }

    if (response.headers.get("content-type")?.includes("application/json")) {
        return await response.json();
    } else {
        // Handle successful responses that might not be JSON (e.g., plain text) if needed
        return { success: true, data: await response.text() }; // Or just return response.text()
    }
}

// Utility function to handle various HTTP requests
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            // Only add Content-Type if there is a body
            ...(body && { 'Content-Type': 'application/json' }),
            // Add other headers like Authorization if needed
            // 'Authorization': `Bearer ${your_token}`
        },
        // Only add body if it's provided
        ...(body && { body: JSON.stringify(body) })
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        // handleResponse ghadi y throwi error ila response machi OK
        return await handleResponse(response);
    } catch (error) {
        // Kan loggiw l'erreur bach nchofoha f console (debugging)
        console.error(`Erreur avec la requête API [${method}] sur ${endpoint}:`, error.message || error);

        // *** === L CORRECTION HIYA HADI === ***
        // Bla man rej3o null, kan throwiw l'erreur li jatna
        // Bach l function li 3eytat l apiRequest (e.g., addSale)
        // tched l'erreur b message dyalha exacte.
        throw error;
        // return null; // <<< KAN HEYDO HADI
        // *** ============================= ***
    }
}

// --- Fonctions des produits (Product Functions) ---
// (Kayb9aw b7al qbel - makaynach mochkil fihom)
export async function getProducts() {
    return apiRequest('/products');
}
export async function addProduct(productData) {
    return apiRequest('/products', 'POST', productData);
}
export async function updateProduct(productId, productData) {
    return apiRequest(`/products/${productId}`, 'PUT', productData);
}
export async function deleteProduct(productId) {
    const result = await apiRequest(`/products/${productId}`, 'DELETE');
    return result !== null;
}

// --- Fonctions de gestion des stocks (Stock Functions) ---
// (Kayb9aw b7al qbel)
export async function getStockOperations() {
    return apiRequest('/stock-operations');
}
export async function getStockOperationDetails(operationId) {
    return apiRequest(`/stock-operations/${operationId}`);
}
export async function addStockOperation(operationData) {
    return apiRequest('/stock-operations', 'POST', operationData);
}
export async function deleteStockOperationById(operationId) {
    const result = await apiRequest(`/stock-operations/${operationId}`, 'DELETE');
    return result !== null; // Same comment as deleteProduct applies here
}

// --- Fonctions de vente (Sales Functions) ---
// (Kayb9aw b7al qbel)
export async function getSales() {
    return apiRequest('/sell-operations');
}
export async function getSaleDetails(saleId) {
    return apiRequest(`/sell-operations/${saleId}`);
}
export async function addSale(saleData) {
    return apiRequest('/sell-operations', 'POST', saleData);
}
export async function deleteSale(saleId) {
    // Original logic relied on apiRequest returning null on error.
    // With the change, apiRequest now *throws* on error.
    // So, if the call succeeds, it won't throw. We return true.
    // If it fails, the error is thrown *before* we reach the return statement.
    // The calling function (in vents-management.js) will catch this error.
    try {
        await apiRequest(`/sell-operations/${saleId}`, 'DELETE');
        return true; // Reached here, means apiRequest succeeded (didn't throw)
    } catch (error) {
        // The error is already logged by apiRequest's catch block.
        // We need deleteSale to conform to its Promise<boolean> signature
        // in the *calling* code's perspective (vents-management.js).
        // The catch block there expects deleteSale to return false on failure.
        return false;
    }
    // Old logic:
    // const result = await apiRequest(`/sell-operations/${saleId}`, 'DELETE');
    // return result !== null;
}
