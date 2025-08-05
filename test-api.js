const axios = require('axios');

const API_KEY = process.env.REACT_APP_NYT_API_KEY || "your-api-key-here";
const BASE_URL = "https://api.nytimes.com/svc/search/v2/articlesearch.json";

async function testAPI() {
  try {
    console.log('Testing NYT API with rows=50...');
    
    const response = await axios.get(BASE_URL, {
      params: {
        "api-key": API_KEY,
        "q": "technology",
        "page": 0,
        "rows": 50,
        "fl": "web_url,headline,abstract,byline,multimedia,news_desk,print_page,print_section,pub_date,section_name,snippet,source,subsection_name,type_of_material,uri,word_count,_id,lead_paragraph"
      }
    });
    
    const docs = response?.data?.response?.docs;
    const totalHits = response?.data?.response?.meta?.hits;
    
    console.log('API Response:');
    console.log('- Total hits available:', totalHits);
    console.log('- Results returned:', docs?.length || 0);
    console.log('- Page:', response?.data?.response?.meta?.offset || 0);
    console.log('- Requested rows:', 50);
    
    if (docs && docs.length > 0) {
      console.log('\nFirst 3 results:');
      docs.slice(0, 3).forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.headline?.main || 'No title'}`);
      });
    }
    
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

testAPI(); 