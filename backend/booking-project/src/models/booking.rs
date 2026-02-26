use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Passenger {
    pub name: String,
    pub age: String,
    pub gender: String,
}

#[derive(Serialize, Deserialize)]
pub struct Booking {
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub user_id: mongodb::bson::oid::ObjectId,
    pub bus_id: mongodb::bson::oid::ObjectId,
    pub seat_number: String,
    pub travel_date: String,
    pub booking_date: mongodb::bson::DateTime,
    pub status: String,
    pub passenger: Option<Passenger>,
}

#[derive(Serialize, Deserialize)]
pub struct CreateBookingRequest {
    pub bus_id: String,
    pub seat_number: String,
    pub travel_date: String,
    pub passenger: Option<Passenger>,
}
