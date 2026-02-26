use actix_web::{web, HttpResponse, Error};
use futures::StreamExt;
use crate::db::MongoDB;
use crate::models::bus::SeatDateQuery;

pub async fn get_buses(db: web::Data<MongoDB>) -> Result<HttpResponse, Error> {
    let mut cursor = db.get_buses().await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    
    let mut buses = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(bus) => {
                let resp: crate::models::bus::BusResponse = bus.into();
                buses.push(resp);
            },
            Err(e) => return Err(actix_web::error::ErrorInternalServerError(e)),
        }
    }
    
    Ok(HttpResponse::Ok().json(buses))
}

pub async fn get_bus(db: web::Data<MongoDB>, path: web::Path<String>) -> Result<HttpResponse, Error> {
    let id = path.into_inner();
    let bus = db.get_bus(&id).await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    
    match bus {
        Some(bus) => {
            let resp: crate::models::bus::BusResponse = bus.into();
            Ok(HttpResponse::Ok().json(resp))
        },
        None => Ok(HttpResponse::NotFound().body("Bus not found")),
    }
}

pub async fn get_bus_seats(
    db: web::Data<MongoDB>,
    path: web::Path<String>,
    query: web::Query<SeatDateQuery>,
) -> Result<HttpResponse, Error> {
    let bus_id = path.into_inner();
    let seat_date = query.date.clone();
    
    let seats = db.get_bus_seats(&bus_id, &seat_date).await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    
    let response = crate::models::bus::SeatAvailabilityResponse {
        travel_date: seat_date,
        seats,
    };
    
    Ok(HttpResponse::Ok().json(response))
}