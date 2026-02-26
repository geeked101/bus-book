use actix_web::{
    body::EitherBody,
    dev::{Service, Transform, ServiceRequest, ServiceResponse, Response},
    Error, HttpResponse, http
};
use futures::future::{Ready, LocalBoxFuture, ready};
use std::task::{Context, Poll};
use std::rc::Rc;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use crate::models::Claims;

pub struct Auth;

impl<S, B> Transform<S, ServiceRequest> for Auth
where
    S: Service<ServiceRequest, Response = Response<EitherBody<B>>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = Response<EitherBody<B>>;
    type Error = Error;
    type Transform = AuthMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddleware { service: Rc::new(service) }))
    }
}

pub struct AuthMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = Response<EitherBody<B>>, Error = Error> + 'static,
    B: 'static,
{
    type Response = Response<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);
        
        Box::pin(async move {
            let auth_header = req.headers().get(http::header::AUTHORIZATION);
            
            if let Some(auth_header) = auth_header {
                if let Ok(auth_str) = auth_header.to_str() {
                    if auth_str.starts_with("Bearer ") {
                        let token = &auth_str[7..];
                        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
                        
                        let validation = Validation::new(Algorithm::HS256);
                        if decode::<Claims>(token, &DecodingKey::from_secret(secret.as_ref()), &validation).is_ok() {
                            return service.call(req).await;
                        }
                    }
                }
            }
            
            let (request, _pl) = req.into_parts();
            let response = HttpResponse::Unauthorized()
                .json(serde_json::json!({"error": "Unauthorized"}))
                .map_into_right_body();
            
            Ok(ServiceResponse::new(request, response).into())
        })
    }
}

pub struct AdminAuth;

impl<S, B> Transform<S, ServiceRequest> for AdminAuth
where
    S: Service<ServiceRequest, Response = Response<EitherBody<B>>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = Response<EitherBody<B>>;
    type Error = Error;
    type Transform = AdminAuthMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AdminAuthMiddleware { service: Rc::new(service) }))
    }
}

pub struct AdminAuthMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AdminAuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = Response<EitherBody<B>>, Error = Error> + 'static,
    B: 'static,
{
    type Response = Response<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);
        
        Box::pin(async move {
            let auth_header = req.headers().get(http::header::AUTHORIZATION);
            
            if let Some(auth_header) = auth_header {
                if let Ok(auth_str) = auth_header.to_str() {
                    if auth_str.starts_with("Bearer ") {
                        let token = &auth_str[7..];
                        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
                        
                        let validation = Validation::new(Algorithm::HS256);
                        if let Ok(token_data) = decode::<Claims>(token, &DecodingKey::from_secret(secret.as_ref()), &validation) {
                            if token_data.claims.role == "admin" {
                                return service.call(req).await;
                            }
                        }
                    }
                }
            }
            
            let (request, _pl) = req.into_parts();
            let response = HttpResponse::Forbidden()
                .json(serde_json::json!({"error": "Admin access required"}))
                .map_into_right_body();
            
            Ok(ServiceResponse::new(request, response).into())
        })
    }
}