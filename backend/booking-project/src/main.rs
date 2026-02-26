mod db;
mod models;
mod handlers;
mod middleware;

use actix_cors::Cors;
use actix_web::{http, web, App, HttpServer, Responder, HttpResponse};
use actix_web::middleware::Logger;
use db::mongodb::MongoDB;
use handlers::{auth, buses, bookings};
use middleware::auth::Auth;

// Simple health check endpoint
async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "Server is running",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    std::env::set_var("RUST_LOG", "debug");
    std::env::set_var("RUST_BACKTRACE", "1");
    env_logger::init();
    
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    let db_name = std::env::var("DATABASE_NAME")
        .unwrap_or_else(|_| "booking_system".to_string());
    
    let db = MongoDB::new(&database_url, &db_name)
        .await
        .expect("Failed to connect to MongoDB");
    
    let db_data = web::Data::new(db.clone());
    
    // Seed data on startup
    if let Err(e) = db.seed_data().await {
        eprintln!("⚠️ Failed to seed data: {}", e);
    }
    
    println!("🚀 Starting server on http://0.0.0.0:8080");
    println!("📡 Frontend should connect to: http://localhost:8080");
    println!("🏥 Health check: http://localhost:8080/api/health");
    println!("🚌 Buses API: http://localhost:8080/api/buses");
    
    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .wrap(
                Cors::default()
                    .allowed_origin("http://localhost:3000")
                    .allowed_origin("http://127.0.0.1:3000")
                    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
                    .allowed_headers(vec![
                        http::header::AUTHORIZATION,
                        http::header::ACCEPT,
                        http::header::CONTENT_TYPE,
                    ])
                    .supports_credentials()
                    .max_age(3600)
            )
            .app_data(db_data.clone())
            .service(
                web::scope("/api")
                    .route("/health", web::get().to(health_check))
                    .service(
                        web::scope("/auth")
                            .route("/register", web::post().to(auth::register))
                            .route("/login", web::post().to(auth::login))
                            .route("/google", web::post().to(auth::google_login))
                    )
                    .service(
                        web::scope("/buses")
                            .route("", web::get().to(buses::get_buses))
                            .route("/{id}", web::get().to(buses::get_bus))
                            .route("/{id}/seats", web::get().to(buses::get_bus_seats))
                    )
                    .service(
                        web::scope("/bookings")
                            .route("", web::post().to(bookings::create_booking))
                            .route("/user", web::get().to(bookings::get_user_bookings))
                            .route("/{id}", web::delete().to(bookings::cancel_booking))
                    )
            )
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}