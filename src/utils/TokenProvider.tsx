import {supabase} from '../lib/supabase';

export const tokenProvider = async()=>{
    try {
        const response = await supabase.functions.invoke('stream-token');
        
        if(response.error){
            console.error("Error fetching token:", response.error);
            throw new Error(`Failed to fetch token: ${response.error.message}`);
        }
        
        if(!response.data || !response.data.token){
            console.error("Invalid token response:", response.data);
            throw new Error('Token not found in response');
        }
        
        console.log("Fetched token:", response.data.token);
        // Return just the token string, not the entire object
        return response.data.token;
    } catch (error) {
        console.error("Token provider error:", error);
        throw error;
    }
}