use actix_web::{web, HttpResponse, Error};
use crate::db::MongoDB;
use serde_json::json;

pub async fn register(
    db: web::Data<MongoDB>,
    user: web::Json<crate::models::RegisterRequest>,
) -> Result<HttpResponse, Error> {
    match db.create_user(&user).await {
        Ok(auth_response) => Ok(HttpResponse::Ok().json(auth_response)),
        Err(e) => Ok(HttpResponse::BadRequest().json(json!({ "error": e.to_string() }))),
    }
}

pub async fn login(
    db: web::Data<MongoDB>,
    credentials: web::Json<crate::models::LoginRequest>,
) -> Result<HttpResponse, Error> {
    match db.authenticate_user(&credentials).await {
        Ok(auth_response) => Ok(HttpResponse::Ok().json(auth_response)),
        Err(e) => Ok(HttpResponse::Unauthorized().json(json!({ "error": e.to_string() }))),
    }
}

pub async fn google_login(
    db: web::Data<MongoDB>,
    payload: web::Json<crate::models::GoogleLoginRequest>,
) -> Result<HttpResponse, Error> {
    // 1. Verify token with Google
    let client = reqwest::Client::new();
    let response = client
        .get("https://oauth2.googleapis.com/tokeninfo")
        .query(&[("id_token", &payload.token)])
        .send()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if !response.status().is_success() {
        return Ok(HttpResponse::Unauthorized().json(json!({ "error": "Invalid Google token" })));
    }

    let google_user: serde_json::Value = response
        .json()
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let email = google_user["email"].as_str().unwrap_or("");
    let name = google_user["name"].as_str().unwrap_or("Google User");

    if email.is_empty() {
        return Ok(HttpResponse::BadRequest().json(json!({ "error": "Email not found in Google token" })));
    }

    // 2. Login or Register in DB
    match db.google_login(email, name).await {
        Ok(auth_response) => Ok(HttpResponse::Ok().json(auth_response)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(json!({ "error": e.to_string() }))),
    }
}