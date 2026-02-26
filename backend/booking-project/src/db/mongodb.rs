use log::{info, error, warn};
use mongodb::{
    bson::{self, doc, Document},
    options::FindOptions,
    Client, Collection, Cursor,
};
use futures::StreamExt;

// Import the models we need
use crate::models::{User, UserResponse, Claims, AuthResponse, RegisterRequest, LoginRequest, GoogleLoginRequest, Bus, Seat, Booking};

#[derive(Clone)]
pub struct MongoDB {
    client: Client,
    db_name: String,
}

impl MongoDB {
    pub async fn new(uri: &str, db_name: &str) -> Result<Self, mongodb::error::Error> {
        let client_options = mongodb::options::ClientOptions::parse(uri).await?;
        let client = Client::with_options(client_options)?;
        Ok(MongoDB {
            client,
            db_name: db_name.to_string(),
        })
    }

    fn get_users_collection(&self) -> Collection<Document> {
        self.client.database(&self.db_name).collection("users")
    }

    fn get_buses_collection(&self) -> Collection<Bus> {
        self.client.database(&self.db_name).collection("buses")
    }

    fn get_seat_availability_collection(&self) -> Collection<Document> {
        self.client.database(&self.db_name).collection("seat_availability")
    }

    fn get_bookings_collection(&self) -> Collection<Booking> {
        self.client.database(&self.db_name).collection("bookings")
    }

    pub fn string_to_id(&self, id: &str) -> Result<bson::oid::ObjectId, mongodb::error::Error> {
        bson::oid::ObjectId::parse_str(id).map_err(|e| {
            mongodb::error::Error::from(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                e.to_string(),
            ))
        })
    }

    pub async fn create_user(&self, user: &RegisterRequest) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let collection = self.get_users_collection();
        
        // Check if user already exists
        let existing_user = collection.find_one(doc! { "email": &user.email }, None).await?;
        if existing_user.is_some() {
            return Err("User already exists".into());
        }

        let hashed_password = bcrypt::hash(&user.password, bcrypt::DEFAULT_COST)?;
        
        let user_doc = doc! {
            "username": &user.username,
            "email": &user.email,
            "password": &hashed_password,
            "role": "user",
            "created_at": bson::DateTime::now(),
            "updated_at": bson::DateTime::now(),
        };

        let result = collection.insert_one(user_doc, None).await?;
        let user_id = result.inserted_id.as_object_id().unwrap();

        // Generate JWT token
        let expiration = chrono::Utc::now() + chrono::Duration::hours(24);
        let claims = Claims {
            sub: user_id.to_hex(),
            role: "user".to_string(),
            exp: expiration.timestamp() as usize,
        };

        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
        let token = jsonwebtoken::encode(&jsonwebtoken::Header::default(), &claims, &jsonwebtoken::EncodingKey::from_secret(secret.as_ref()))?;

        let user_response = UserResponse {
            id: user_id.to_hex(),
            username: user.username.clone(),
            email: user.email.clone(),
            role: "user".to_string(),
        };

        Ok(AuthResponse {
            token,
            user: user_response,
        })
    }

    pub async fn authenticate_user(&self, credentials: &LoginRequest) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let collection = self.get_users_collection();
        
        let user_doc = collection.find_one(doc! { "email": &credentials.email }, None).await?
            .ok_or("Invalid credentials")?;

        let user = bson::from_document::<User>(user_doc)?;

        if bcrypt::verify(&credentials.password, &user.password).map_err(|e| {
            error!("Bcrypt verification error: {}", e);
            e
        })? {
            let user_id = user.id.ok_or_else(|| {
                error!("User document found for {} but missing ID", credentials.email);
                "User ID not found"
            })?;
            
            let expiration = chrono::Utc::now() + chrono::Duration::hours(168); // Match .env or use 168
            let claims = Claims {
                sub: user_id.to_hex(),
                role: user.role.clone(),
                exp: expiration.timestamp() as usize,
            };

            let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
            let token = jsonwebtoken::encode(
                &jsonwebtoken::Header::default(), 
                &claims, 
                &jsonwebtoken::EncodingKey::from_secret(secret.as_ref())
            ).map_err(|e| {
                error!("JWT encoding error: {}", e);
                e
            })?;

            info!("User {} authenticated successfully", user.email);
            let user_response = UserResponse {
                id: user_id.to_hex(),
                username: user.username,
                email: user.email,
                role: user.role,
            };

            Ok(AuthResponse {
                token,
                user: user_response,
            })
        } else {
            warn!("Invalid password attempt for email: {}", credentials.email);
            Err("Invalid credentials".into())
        }
    }

    pub async fn google_login(&self, email: &str, name: &str) -> Result<AuthResponse, Box<dyn std::error::Error>> {
        let collection = self.get_users_collection();
        
        // Find existing user or create a new one
        let user_doc = collection.find_one(doc! { "email": email }, None).await?;
        
        let (user_id, username, user_email, role) = if let Some(doc) = user_doc {
            let u = bson::from_document::<User>(doc).map_err(|e| {
                error!("BSON deserialization error for Google user: {}", e);
                e
            })?;
            let uid = u.id.ok_or_else(|| {
                error!("User found for Google account {} but missing ID", email);
                "User ID not found"
            })?;
            (uid, u.username, u.email, u.role)
        } else {
            // Create new user
            let new_user_doc = doc! {
                "username": name,
                "email": email,
                "password": "", // No password for Google users
                "role": "user",
                "created_at": bson::DateTime::now(),
                "updated_at": bson::DateTime::now(),
            };
            let result = collection.insert_one(new_user_doc, None).await?;
            (result.inserted_id.as_object_id().unwrap(), name.to_string(), email.to_string(), "user".to_string())
        };

        // Generate JWT token
        let expiration = chrono::Utc::now() + chrono::Duration::hours(24);
        let claims = Claims {
            sub: user_id.to_hex(),
            role: role.clone(),
            exp: expiration.timestamp() as usize,
        };

        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
        let token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(secret.as_ref())
        )?;

        Ok(AuthResponse {
            token,
            user: UserResponse {
                id: user_id.to_hex(),
                username,
                email: user_email,
                role,
            },
        })
    }

    pub async fn get_buses(&self) -> Result<Cursor<Bus>, mongodb::error::Error> {
        let collection = self.get_buses_collection();
        let find_options = FindOptions::builder().build();
        collection.find(None, find_options).await
    }

    pub async fn get_bus(&self, id: &str) -> Result<Option<Bus>, mongodb::error::Error> {
        let collection = self.get_buses_collection();
        let object_id = self.string_to_id(id)?;
        collection.find_one(doc! { "_id": object_id }, None).await
    }

    pub async fn get_bus_seats(&self, bus_id: &str, date: &str) -> Result<Vec<Seat>, mongodb::error::Error> {
        let collection = self.get_seat_availability_collection();
        let object_id = self.string_to_id(bus_id)?;
        
        let doc = collection.find_one(
            doc! { "bus_id": object_id, "travel_date": date },
            None
        ).await?;

        if let Some(doc) = doc {
            if let Ok(seats) = doc.get_array("seats") {
                let seats: Vec<Seat> = seats.iter().filter_map(|s| {
                    if let Some(seat_doc) = s.as_document() {
                        Some(Seat {
                            seat_number: seat_doc.get_str("seat_number").unwrap_or("").to_string(),
                            is_available: seat_doc.get_bool("is_available").unwrap_or(false),
                        })
                    } else {
                        None
                    }
                }).collect();
                return Ok(seats);
            }
        }

        // If no specific availability found, return all seats as available
        let bus = self.get_bus(bus_id).await?;
        if let Some(bus) = bus {
            let seats: Vec<Seat> = (1..=bus.total_seats)
                .map(|i| Seat {
                    seat_number: i.to_string(),
                    is_available: true,
                })
                .collect();
            Ok(seats)
        } else {
            Ok(vec![])
        }
    }

    pub async fn create_booking(&self, user_id: &str, req: &crate::models::booking::CreateBookingRequest) -> Result<crate::models::Booking, Box<dyn std::error::Error>> {
        let bus_id = self.string_to_id(&req.bus_id)?;
        let user_oid = self.string_to_id(user_id)?;
        
        // 1. Check if seat is available
        let seats = self.get_bus_seats(&req.bus_id, &req.travel_date).await?;
        let seat = seats.iter().find(|s| s.seat_number == req.seat_number)
            .ok_or("Seat not found")?;
        
        if !seat.is_available {
            return Err("Seat is already booked".into());
        }

        // 2. Create the booking
        let booking = crate::models::Booking {
            id: None,
            user_id: user_oid,
            bus_id,
            seat_number: req.seat_number.clone(),
            travel_date: req.travel_date.clone(),
            booking_date: bson::DateTime::now(),
            status: "Confirmed".to_string(),
            passenger: req.passenger.clone(),
        };

        let collection = self.get_bookings_collection();
        let result = collection.insert_one(&booking, None).await?;
        let mut new_booking = booking;
        new_booking.id = Some(result.inserted_id.as_object_id().unwrap());

        // 3. Update seat availability
        let availability_coll = self.get_seat_availability_collection();
        
        // Find current availability doc
        let current_availability = availability_coll.find_one(
            doc! { "bus_id": bus_id, "travel_date": &req.travel_date },
            None
        ).await?;

        if let Some(mut doc) = current_availability {
            if let Ok(seats_array) = doc.get_array_mut("seats") {
                for s in seats_array.iter_mut() {
                    if let Some(s_doc) = s.as_document_mut() {
                        if s_doc.get_str("seat_number").unwrap_or("") == req.seat_number {
                            s_doc.insert("is_available", false);
                        }
                    }
                }
                availability_coll.replace_one(
                    doc! { "_id": doc.get_object_id("_id")? },
                    doc,
                    None
                ).await?;
            }
        } else {
            // Create initial availability with this seat booked
            let bus = self.get_bus(&req.bus_id).await?.ok_or("Bus not found")?;
            let mut seats_doc = Vec::new();
            for i in 1..=bus.total_seats {
                let seat_num = i.to_string();
                seats_doc.push(doc! {
                    "seat_number": &seat_num,
                    "is_available": seat_num != req.seat_number
                });
            }
            availability_coll.insert_one(doc! {
                "bus_id": bus_id,
                "travel_date": &req.travel_date,
                "seats": seats_doc
            }, None).await?;
        }

        Ok(new_booking)
    }

    pub async fn get_user_bookings(&self, user_id: &str) -> Result<Vec<crate::models::Booking>, Box<dyn std::error::Error>> {
        let user_oid = self.string_to_id(user_id)?;
        let collection = self.get_bookings_collection();
        let mut cursor = collection.find(doc! { "user_id": user_oid }, None).await?;
        
        let mut bookings = Vec::new();
        while let Some(result) = cursor.next().await {
            bookings.push(result?);
        }
        Ok(bookings)
    }

    pub async fn cancel_booking(&self, booking_id: &str, user_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let booking_oid = self.string_to_id(booking_id)?;
        let user_oid = self.string_to_id(user_id)?;
        let collection = self.get_bookings_collection();

        // 1. Find the booking to get bus_id and seat_number
        let booking = collection.find_one(
            doc! { "_id": booking_oid, "user_id": user_oid },
            None
        ).await?.ok_or("Booking not found")?;

        // 2. Update booking status
        collection.update_one(
            doc! { "_id": booking_oid },
            doc! { "$set": { "status": "Cancelled" } },
            None
        ).await?;

        // 3. Update seat availability
        let availability_coll = self.get_seat_availability_collection();
        let current_availability = availability_coll.find_one(
            doc! { "bus_id": booking.bus_id, "travel_date": &booking.travel_date },
            None
        ).await?;

        if let Some(mut doc) = current_availability {
            if let Ok(seats_array) = doc.get_array_mut("seats") {
                for s in seats_array.iter_mut() {
                    if let Some(s_doc) = s.as_document_mut() {
                        if s_doc.get_str("seat_number").unwrap_or("") == booking.seat_number {
                            s_doc.insert("is_available", true);
                        }
                    }
                }
                availability_coll.replace_one(
                    doc! { "_id": doc.get_object_id("_id")? },
                    doc,
                    None
                ).await?;
            }
        }

        Ok(())
    }

    pub async fn seed_data(&self) -> Result<(), Box<dyn std::error::Error>> {
        let collection = self.get_buses_collection();
        
        // Force seed if env var is set
        let force_seed = std::env::var("FORCE_SEED").unwrap_or_else(|_| "false".to_string()) == "true";
        
        if force_seed {
            println!("🧹 Force seeding enabled. Clearing buses collection...");
            collection.delete_many(doc! {}, None).await?;
        }

        let count = collection.count_documents(None, None).await?;
        
        if count == 0 {
            println!("🌱 Seeding actual Kenyan bus data...");
            let sample_buses = vec![
                Bus {
                    id: None,
                    bus_number: "Easy Coach - KCH 123A".to_string(),
                    bus_type: "Standard".to_string(),
                    total_seats: 44,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Kisumu".to_string(),
                        departure_time: "08:15 AM".to_string(),
                        arrival_time: "04:30 PM".to_string(),
                        price: 1450.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Mash East Africa - KDA 456B".to_string(),
                    bus_type: "VIP Oxygen".to_string(),
                    total_seats: 36,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Mombasa".to_string(),
                        departure_time: "10:00 PM".to_string(),
                        arrival_time: "06:00 AM".to_string(),
                        price: 2200.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Tahmeed - KDB 789C".to_string(),
                    bus_type: "Luxury Coach".to_string(),
                    total_seats: 32,
                    route: crate::models::bus::Route {
                        from: "Mombasa".to_string(),
                        to: "Nairobi".to_string(),
                        departure_time: "09:00 AM".to_string(),
                        arrival_time: "05:00 PM".to_string(),
                        price: 1600.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Dreamline - KDC 012D".to_string(),
                    bus_type: "Executive".to_string(),
                    total_seats: 40,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Eldoret".to_string(),
                        departure_time: "07:30 AM".to_string(),
                        arrival_time: "01:30 PM".to_string(),
                        price: 1300.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Guardian Angel - KDD 345E".to_string(),
                    bus_type: "Standard".to_string(),
                    total_seats: 52,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Busia".to_string(),
                        departure_time: "09:00 PM".to_string(),
                        arrival_time: "05:00 AM".to_string(),
                        price: 1500.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Modern Coast - KDE 678F".to_string(),
                    bus_type: "VIP".to_string(),
                    total_seats: 28,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Mombasa".to_string(),
                        departure_time: "08:00 AM".to_string(),
                        arrival_time: "04:30 PM".to_string(),
                        price: 2500.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Super Metro - KDF 901G".to_string(),
                    bus_type: "Semi-Luxury".to_string(),
                    total_seats: 48,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Nakuru".to_string(),
                        departure_time: "06:00 AM".to_string(),
                        arrival_time: "09:00 AM".to_string(),
                        price: 800.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Transline Galaxy - KDG 234H".to_string(),
                    bus_type: "Standard".to_string(),
                    total_seats: 14,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Kisii".to_string(),
                        departure_time: "10:00 AM".to_string(),
                        arrival_time: "04:00 PM".to_string(),
                        price: 1200.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Spanish - KDH 567I".to_string(),
                    bus_type: "Standard Coach".to_string(),
                    total_seats: 52,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Kakamega".to_string(),
                        departure_time: "08:30 PM".to_string(),
                        arrival_time: "04:30 AM".to_string(),
                        price: 1400.0,
                    },
                },
                Bus {
                    id: None,
                    bus_number: "Mash East Africa - KDI 890J".to_string(),
                    bus_type: "Standard".to_string(),
                    total_seats: 52,
                    route: crate::models::bus::Route {
                        from: "Nairobi".to_string(),
                        to: "Malindi".to_string(),
                        departure_time: "07:00 PM".to_string(),
                        arrival_time: "05:00 AM".to_string(),
                        price: 1800.0,
                    },
                },
            ];
            
            for bus in sample_buses {
                collection.insert_one(bus, None).await?;
            }
            println!("✅ Seeding complete with {} actual buses!", 10);
        }
        Ok(())
    }
}