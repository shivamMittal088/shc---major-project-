use indicatif::{ProgressBar, ProgressStyle};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

use crate::consts::{
    get_shc_backend_api_base_url_from_env, SHC_BACKEND_API_BASE_URL_DEFAULT,
};
use crate::user_config::UserConfig;

const LOCAL_BACKEND_CANDIDATES: [&str; 2] = ["http://localhost:6969", "http://localhost:3000"];

#[derive(Deserialize, Serialize, Clone)]
struct OtpResponse {
    access_token: String,
    refresh_token: String,
    email: String,
    name: String,
    id: String,
}

#[derive(Deserialize)]
struct BackendErrorResponse {
    message: Option<String>,
    error: Option<String>,
}

fn parse_backend_error(body: &str) -> String {
    if let Ok(parsed) = serde_json::from_str::<BackendErrorResponse>(body) {
        if let Some(message) = parsed.message {
            let message = message.trim().to_string();
            if !message.is_empty() {
                return message;
            }
        }

        if let Some(error) = parsed.error {
            let error = error.trim().to_string();
            if !error.is_empty() {
                return error;
            }
        }
    }

    let trimmed = body.trim();
    if trimmed.is_empty() {
        return "No response body from server".to_string();
    }

    trimmed.to_string()
}

fn is_otp_delivery_outage(message: &str) -> bool {
    let message = message.to_lowercase();

    (message.contains("dial tcp") && (message.contains(":587") || message.contains("smtp")))
        || message.contains("connection timed out")
        || message.contains("failed to send otp")
        || message.contains("otp service is temporarily unavailable")
}

fn otp_delivery_hint() -> &'static str {
    "Hint: OTP email service is unreachable from backend. Ensure local backend is running, then retry:\n  $env:SHC_BACKEND_API_BASE_URL = \"http://localhost:<your-backend-port>\"\n  # Example: http://localhost:6969\n  shc login"
}

fn should_try_local_fallback(
    api_base_url: &str,
    status: StatusCode,
    error_message: &str,
    has_env_override: bool,
) -> bool {
    if has_env_override {
        return false;
    }

    api_base_url == SHC_BACKEND_API_BASE_URL_DEFAULT
        && status.is_server_error()
        && is_otp_delivery_outage(error_message)
}

async fn try_local_backend_fallback(
    client: &reqwest::Client,
    name: &str,
    email: &str,
) -> Option<String> {
    for candidate in LOCAL_BACKEND_CANDIDATES {
        let response = client
            .post(format!("{}/auth/otp", candidate))
            .json(&json!({
                "name": name,
                "email": email,
            }))
            .send()
            .await;

        if let Ok(res) = response {
            if res.status().is_success() {
                return Some(candidate.to_string());
            }
        }
    }

    None
}

pub async fn login(user_config: &mut UserConfig) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let env_override = get_shc_backend_api_base_url_from_env();
    let mut api_base_url = user_config.get_backend_api_base_url();

    let name = dialoguer::Input::<String>::new()
        .with_prompt("Name")
        .interact_text()
        .unwrap();

    let email = dialoguer::Input::<String>::new()
        .with_prompt("Email")
        .interact_text()
        .unwrap();

    let pb = ProgressBar::new_spinner();

    pb.enable_steady_tick(Duration::from_millis(200));
    pb.set_style(
        ProgressStyle::with_template("{spinner:.dim.bold} shc: {wide_msg}")
            .unwrap()
            .tick_chars("/|\\- "),
    );
    pb.set_message("Sending OTP...");
    let otp_res = client
        .post(format!("{}/auth/otp", api_base_url))
        .json(&json!({
            "name": name,
            "email": email
        }))
        .send()
        .await?;

    if !otp_res.status().is_success() {
        pb.finish_and_clear();
        let status = otp_res.status();
        let body = otp_res.text().await.unwrap_or_default();
        let backend_error = parse_backend_error(&body);
        let fallback_error_context = format!("{} {}", backend_error, body);
        let mut error_message = format!(
            "Failed to send OTP from {} ({}): {}",
            api_base_url,
            status,
            backend_error
        );

        if should_try_local_fallback(
            &api_base_url,
            status,
            &fallback_error_context,
            env_override.is_some(),
        ) {
            if let Some(local_api_base_url) =
                try_local_backend_fallback(&client, &name, &email).await
            {
                api_base_url = local_api_base_url;
                user_config.backend_api_base_url = Some(api_base_url.clone());
                user_config.save();
                println!(
                    "Production OTP failed. Automatically switched to local backend: {}",
                    api_base_url
                );
            } else {
                error_message.push('\n');
                error_message.push_str(otp_delivery_hint());
                return Err(error_message.into());
            }
        } else {
            if is_otp_delivery_outage(&body) || is_otp_delivery_outage(&error_message) {
                error_message.push('\n');
                error_message.push_str(otp_delivery_hint());
            }

            return Err(error_message.into());
        }
    }

    // print!("{:?}", res);

    pb.finish_and_clear();

    let otp = dialoguer::Input::<String>::new()
        .with_prompt("Check your mail for OTP, Enter")
        .interact_text()
        .unwrap();

    let pb = ProgressBar::new_spinner();

    pb.enable_steady_tick(Duration::from_millis(200));
    pb.set_style(
        ProgressStyle::with_template("{spinner:.dim.bold} shc: {wide_msg}")
            .unwrap()
            .tick_chars("/|\\- "),
    );
    pb.set_message("Verifying OTP...");

    let res = client
        .post(format!("{}/auth/login", api_base_url))
        .json(&json!(
            {
                "name": name,
                "otp": otp,
                "email": email
            }
        ))
        .send()
        .await?;

    pb.finish_and_clear();
    if res.status().is_success() {
        println!("Login Successfull");
        let res: OtpResponse = res.json().await?;
        user_config.user.email = Some(res.email);
        user_config.user.name = Some(res.name);
        user_config.user.user_id = Some(res.id);
        user_config.user.access_token = Some(res.access_token);
        user_config.user.refresh_token = Some(res.refresh_token);
        if env_override.is_none() {
            user_config.backend_api_base_url = Some(api_base_url);
        }
        user_config.save();
    } else {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!(
            "Login failed from {} ({}): {}",
            user_config.get_backend_api_base_url(),
            status,
            parse_backend_error(&body)
        )
        .into());
    }
    Ok(())
}

pub async fn check_for_api_key(
    user_config: &mut UserConfig,
) -> Result<(), Box<dyn std::error::Error>> {
    match user_config.user.access_token.as_ref() {
        Some(_) => {}
        None => {
            println!("Please login first");
            login(user_config).await?;
        }
    }
    Ok(())
}

pub fn logout(user_config: &mut UserConfig) {
    user_config.clear();
    println!("Logged out");
}
