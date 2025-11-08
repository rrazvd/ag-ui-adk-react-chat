/**
 * Utility function to get query parameters from the URL
 * @param param - The name of the query parameter to retrieve
 * @returns The value of the query parameter or null if not found
 */
export const getQueryParam = (param: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

/**
 * Updates the browser URL with a new query parameter
 * @param paramName - The name of the query parameter to update
 * @param newValue - The new value to set for the parameter
 * @param preserveParam - If true, always keeps the param even if empty/default
 */
export const updateUrlQueryParam = (
  paramName: string, 
  newValue: string, 
  preserveParam: boolean = false
) => {
  const currentUrl = new URL(window.location.href);
  
  if (!preserveParam && !newValue) {
    // Only remove if explicitly not preserving and value is empty
    currentUrl.searchParams.delete(paramName);
  } else {
    // Set the new parameter value
    currentUrl.searchParams.set(paramName, newValue);
  }
  
  // Update the browser URL without refreshing the page
  window.history.replaceState({}, '', currentUrl.toString());
};

/**
 * Safely parses a JSON string from a query parameter
 * @param jsonString - The JSON string to parse
 * @param fallback - The fallback value if parsing fails
 * @returns The parsed object or the fallback value
 */
export const parseJsonQueryParam = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('Failed to parse JSON from query parameter:', error);
    return fallback;
  }
};

/**
 * Builds a URL with multiple query parameters safely
 * @param baseUrl - The base URL (without query parameters)
 * @param params - Object with key-value pairs for query parameters
 * @returns The complete URL with encoded query parameters
 */
export const buildUrlWithParams = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};