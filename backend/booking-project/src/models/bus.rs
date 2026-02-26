use serde::{Deserialize, Serialize, Serializer};

#[derive(Serialize, Deserialize, Clone)]
pub struct Bus {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_id_as_hex"
    )]
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub bus_number: String,
    pub bus_type: String,
    pub total_seats: i32,
    pub route: Route,
}

fn serialize_id_as_hex<S>(
    id: &Option<mongodb::bson::oid::ObjectId>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match id {
        Some(oid) => serializer.serialize_str(&oid.to_hex()),
        None => serializer.serialize_none(),
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Route {
    pub from: String,
    pub to: String,
    pub departure_time: String,
    pub arrival_time: String,
    pub price: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BusResponse {
    pub id: String,
    pub bus_number: String,
    pub bus_type: String,
    pub total_seats: i32,
    pub route: Route,
}

impl From<Bus> for BusResponse {
    fn from(bus: Bus) -> Self {
        Self {
            id: bus.id.map(|oid| oid.to_hex()).unwrap_or_default(),
            bus_number: bus.bus_number,
            bus_type: bus.bus_type,
            total_seats: bus.total_seats,
            route: bus.route,
        }
    }
}
#[derive(Serialize, Deserialize, Clone)]
pub struct Seat {
    pub seat_number: String,
    pub is_available: bool,
}

#[derive(Serialize, Deserialize)]
pub struct SeatAvailabilityResponse {
    pub travel_date: String,
    pub seats: Vec<Seat>,
}

#[derive(Deserialize)]
pub struct SeatDateQuery {
    pub date: String,
}
