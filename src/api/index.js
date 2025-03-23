export const fetchVideoById = async (id) => {
  try {
    console.log(`API: Fetching video with direct ID call: ${id}`);
    const response = await axios.get(`${API_BASE_URL}/videos/${id}`);
    
    // Check if response has data
    if (!response.data) {
      console.warn('API: Empty response from direct video fetch');
      return null;
    }
    
    console.log(`API: Successfully fetched video with ID ${id}`);
    return response.data;
  } catch (error) {
    // Log the specific HTTP status if available
    if (error.response) {
      console.error(`API: Error fetching video ${id} - Status: ${error.response.status}`);
      if (error.response.status === 404) {
        console.warn(`API: Video with ID ${id} not found (404)`);
      }
    } else {
      console.error(`API: Error fetching video ${id}:`, error.message || error);
    }
    
    // Don't throw, just return null to allow the pagination approach as a fallback
    return null;
  }
}; 

export const fetchVideos = async (skip = 0, limit = 20) => {
  try {
    console.log(`API: Fetching videos with skip=${skip}, limit=${limit}`);
    const response = await axios.get(`${API_BASE_URL}/videos/?skip=${skip}&limit=${limit}`);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.warn(`API: Unexpected response format from fetchVideos: `, response.data);
      return [];
    }
    
    console.log(`API: Received ${response.data.length} videos`);
    return response.data;
  } catch (error) {
    console.error("API: Error fetching videos:", error.message || error);
    if (error.response) {
      console.error(`API: Error status: ${error.response.status}`);
    }
    return []; // Return an empty array on error
  }
}; 