use actix_web::{web, HttpResponse, Error, HttpRequest};
use log::{debug, error};
use crate::db::MongoDB;
use crate::models::booking::CreateBookingRequest;
use crate::models::Claims;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde_json::json;

// Helper to extract user_id from JWT token in Authorization header
fn get_user_id_from_token(req: &HttpRequest) -> Option<String> {
    let auth_header = req.headers().get("Authorization");
    if auth_header.is_none() {
        debug!("Missing Authorization header");
        return None;
    }
    
    let auth_str = auth_header.unwrap().to_str().ok();
    if auth_str.is_none() || !auth_str.unwrap().starts_with("Bearer ") {
        debug!("Invalid Authorization header format");
        return None;
    }
    
    let token = &auth_str.unwrap()[7..];
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
    
    debug!("Attempting to decode token with secret: {}...", &secret[..std::cmp::min(3, secret.len())]);
    
    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    ) {
        Ok(token_data) => {
            debug!("Token decoded successfully for user: {}", token_data.claims.sub);
            Some(token_data.claims.sub)
        },
        Err(e) => {
            error!("Token decoding failed: {:?}", e);
            None
        }
    }
}

pub async fn create_booking(
    req: HttpRequest,
    db: web::Data<MongoDB>,
    booking_req: web::Json<CreateBookingRequest>,
) -> Result<HttpResponse, Error> {
    let user_id = match get_user_id_from_token(&req) {
        Some(id) => id,
        None => return Ok(HttpResponse::Unauthorized().json(json!({ "error": "Unauthorized" }))),
    };

    match db.create_booking(&user_id, &booking_req).await {
        Ok(booking) => Ok(HttpResponse::Created().json(booking)),
        Err(e) => Ok(HttpResponse::BadRequest().json(json!({ "error": e.to_string() }))),
    }
}

pub async fn get_user_bookings(
    req: HttpRequest,
    db: web::Data<MongoDB>,
) -> Result<HttpResponse, Error> {
    let user_id = match get_user_id_from_token(&req) {
        Some(id) => id,
        None => return Ok(HttpResponse::Unauthorized().json(json!({ "error": "Unauthorized" }))),
    };

    match db.get_user_bookings(&user_id).await {
        Ok(bookings) => {
            let mut detailed_bookings = Vec::new();
            for b in bookings {
                let bus = db.get_bus(&b.bus_id.to_hex()).await.ok().flatten();
                detailed_bookings.push(json!({
                    "id": b.id.map(|id| id.to_hex()),
                    "busId": b.bus_id.to_hex(),
                    "busName": bus.as_ref().map(|b| b.bus_number.clone()).unwrap_or_else(|| "Unknown Bus".to_string()),
                    "busType": bus.as_ref().map(|b| b.bus_type.clone()).unwrap_or_else(|| "Unknown".to_string()),
                    "from": bus.as_ref().map(|b| b.route.from.clone()).unwrap_or_else(|| "Unknown".to_string()),
                    "to": bus.as_ref().map(|b| b.route.to.clone()).unwrap_or_else(|| "Unknown".to_string()),
                    "departure": bus.as_ref().map(|b| b.route.departure_time.clone()).unwrap_or_else(|| "Unknown".to_string()),
                    "arrival": bus.as_ref().map(|b| b.route.arrival_time.clone()).unwrap_or_else(|| "Unknown".to_string()),
                    "totalPrice": bus.as_ref().map(|b| b.route.price).unwrap_or(0.0),
                    "seats": vec![b.seat_number.clone()],
                    "status": b.status.to_lowercase(),
                    "date": b.travel_date,
                    "bookingDate": b.booking_date.to_string(), // Simple string representation
                    "bookingId": b.id.map(|id| id.to_hex().to_uppercase()).unwrap_or_else(|| "N/A".to_string()),
                    "passengers": if let Some(p) = b.passenger {
                        vec![json!({ "name": p.name, "seatNumber": b.seat_number, "age": p.age, "gender": p.gender })]
                    } else {
                        vec![json!({ "name": "User", "seatNumber": b.seat_number, "age": "N/A", "gender": "N/A" })]
                    }
                }));
            }
            Ok(HttpResponse::Ok().json(detailed_bookings))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(json!({ "error": e.to_string() }))),
    }
}

pub async fn cancel_booking(
    req: HttpRequest,
    db: web::Data<MongoDB>,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    let booking_id = path.into_inner();
    let user_id = match get_user_id_from_token(&req) {
        Some(id) => id,
        None => return Ok(HttpResponse::Unauthorized().json(json!({ "error": "Unauthorized" }))),
    };

    match db.cancel_booking(&booking_id, &user_id).await {
        Ok(_) => Ok(HttpResponse::Ok().json(json!({ "success": true, "message": "Booking cancelled successfully" }))),
        Err(e) => Ok(HttpResponse::BadRequest().json(json!({ "error": e.to_string() }))),
    }
}
