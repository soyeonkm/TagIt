# Gemini LLM Setup for Intelligent Roster Parsing

TagIt now uses Google's Gemini LLM to intelligently parse sports team rosters from web pages, providing much more accurate player information extraction than traditional regex patterns.

## 🚀 **Benefits of Gemini LLM**

- **Intelligent Parsing**: Understands context and structure of roster pages
- **Flexible Format Support**: Works with various website layouts and formats
- **Accurate Extraction**: Better at identifying player names, numbers, and positions
- **Fallback Support**: Automatically falls back to basic HTML parsing if needed

## 🔑 **Getting Your Gemini API Key**

### **Step 1: Visit Google AI Studio**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account

### **Step 2: Create API Key**

1. Click **"Create API Key"**
2. Give your key a name (e.g., "TagIt Roster Parser")
3. Copy the generated API key

### **Step 3: Configure Environment**

1. Copy `env.template` to `.env` in your backend directory
2. Add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   ```

## 📁 **File Structure**

```
backend/TagIt/
├── .env                    # Your environment variables (create this)
├── env.template           # Template showing required variables
└── src-tauri/
    └── src/
        └── autotagger.rs  # Updated with Gemini integration
```

## 🔧 **How It Works**

### **1. Intelligent Roster Parsing**

When you provide a roster URL, TagIt:

1. **Fetches the HTML** content from the webpage
2. **Sends it to Gemini** with a specialized prompt
3. **Extracts structured data** including:
   - Player names
   - Jersey numbers
   - Positions
   - Team information

### **2. Smart Prompt Engineering**

The system uses a carefully crafted prompt that:

- **Understands sports context**
- **Handles various roster formats**
- **Returns structured JSON**
- **Filters out non-player entries**

### **3. Fallback Mechanism**

If Gemini parsing fails, the system automatically falls back to:

- **Basic HTML parsing**
- **Regex pattern matching**
- **Manual extraction methods**

## 💰 **Pricing & Limits**

- **Free Tier**: 15 requests per minute, 1500 requests per day
- **Paid Tier**: $0.50 per 1M input tokens, $1.50 per 1M output tokens
- **Typical Cost**: Less than $0.01 per roster parse

## 🎯 **Example Usage**

### **Roster URL Examples**

- Team websites
- League roster pages
- Sports news sites
- School athletic pages

### **Expected Output**

```json
{
  "players": [
    {
      "name": "John Smith",
      "jersey_number": 23,
      "position": "Forward",
      "team": "Eagles"
    },
    {
      "name": "Mike Johnson",
      "jersey_number": 45,
      "position": "Defender",
      "team": "Eagles"
    }
  ]
}
```

## 🛠 **Configuration Options**

### **Environment Variables**

```bash
# Required
GEMINI_API_KEY=your_key_here

# Optional (with defaults)
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TEMPERATURE=0.1
GEMINI_MAX_TOKENS=2048
```

### **Advanced Settings**

You can customize the Gemini behavior in `autotagger.rs`:

- **Temperature**: Controls creativity (lower = more consistent)
- **Top-p**: Controls diversity of responses
- **Max tokens**: Limits response length

## 🔒 **Security Considerations**

- **API Key Protection**: Never commit your `.env` file to version control
- **Rate Limiting**: Respect Gemini's rate limits
- **Data Privacy**: HTML content is sent to Google for processing
- **Fallback Security**: Sensitive data falls back to local processing

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Gemini API error"**

   - Check your API key is correct
   - Verify you have sufficient quota
   - Check internet connection

2. **"Failed to parse Gemini response"**

   - System automatically falls back to HTML parsing
   - Check the roster page is accessible
   - Verify the page contains player information

3. **"Rate limit exceeded"**
   - Wait a few minutes before trying again
   - Consider upgrading to paid tier for higher limits

### **Debug Information**

Enable logging to see detailed information:

```bash
RUST_LOG=info npm run tauri dev
```

## 🔄 **Migration from Old System**

If you're upgrading from the previous regex-based system:

1. **No breaking changes** - existing functionality continues to work
2. **Automatic fallback** - if Gemini fails, old system takes over
3. **Improved accuracy** - better player detection and information extraction
4. **Enhanced features** - position and team information extraction

## 📚 **API Reference**

### **Gemini Client Methods**

```rust
// Initialize client
let gemini_client = GeminiClient::new(api_key);

// Generate content
let request = GenerateContentRequest::new()
    .generation_config(GenerationConfig::new()
        .temperature(0.1)
        .max_output_tokens(2048))
    .contents(vec![Content::new()
        .role("user")
        .parts(vec![Part::text(prompt)])]);

let response = gemini_client.generate_content(request).await?;
```

## 🎉 **Getting Started**

1. **Get your Gemini API key** from Google AI Studio
2. **Create `.env` file** with your API key
3. **Restart your application** to load the new configuration
4. **Try parsing a roster** - the system will automatically use Gemini!

The system will now intelligently parse rosters with much higher accuracy and extract comprehensive player information automatically.
