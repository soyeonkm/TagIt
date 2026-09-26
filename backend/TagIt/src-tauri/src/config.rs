use dotenv::dotenv;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub supabase_url: String,
    pub supabase_anon_key: String,
}

impl Config {
    pub fn new() -> Self {
        dotenv().ok();

        let supabase_url = env::var("SUPABASE_URL")
            .expect("SUPABASE_URL must be set in .env");

        let supabase_anon_key = env::var("SUPABASE_ANON_KEY")
            .expect("SUPABASE_ANON_KEY must be set in .env");

        Config {
            supabase_url,
            supabase_anon_key,
        }
    }
}
