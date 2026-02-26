pub mod auth;
pub mod booking;
pub mod bus;
pub mod user;

// Re-export all the models that are used in other modules
pub use auth::{AuthResponse, GoogleLoginRequest, LoginRequest, RegisterRequest};
pub use booking::Booking;
pub use bus::{Bus, Seat, SeatAvailabilityResponse, SeatDateQuery};
pub use user::{Claims, User, UserResponse};
