// This file is auto-generated. Do not edit directly.
// Run: node scripts/generate-swagger.js

import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  "openapi": "3.0.0",
  "info": {
    "title": "CampusRent API",
    "version": "1.0.0",
    "description": "Production API for the CampusRent peer-to-peer campus rental marketplace.\n\n## Authentication\nMost endpoints require a Bearer token in the Authorization header.\nObtain a token via POST /api/auth/signup or POST /api/auth/login.\n\n## Rate Limiting\nAuth endpoints are limited to 10 requests per 15 minutes.\n\n## Error Format\nAll errors return: `{ \"success\": false, \"message\": \"...\", \"requestId\": \"uuid\" }`",
    "contact": {
      "name": "CampusRent Team"
    }
  },
  "servers": [
    {
      "url": "http://localhost:5000",
      "description": "Development"
    }
  ],
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT token from login/signup. Format: Bearer <token>"
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "example": "Something went wrong."
          },
          "requestId": {
            "type": "string",
            "format": "uuid",
            "example": "550e8400-e29b-41d4-a716-446655440000"
          }
        }
      },
      "ValidationError": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "example": "Validation failed."
          },
          "errors": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "field": {
                  "type": "string",
                  "example": "email"
                },
                "message": {
                  "type": "string",
                  "example": "Email is required."
                }
              }
            }
          },
          "requestId": {
            "type": "string",
            "format": "uuid"
          }
        }
      },
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "fullName": {
            "type": "string",
            "example": "Alex Johnson"
          },
          "collegeEmail": {
            "type": "string",
            "format": "email",
            "example": "ajohnson@nitrr.ac.in"
          },
          "role": {
            "type": "string",
            "enum": [
              "USER",
              "ADMIN"
            ]
          },
          "department": {
            "type": "string",
            "nullable": true,
            "example": "Computer Science"
          },
          "yearOfStudy": {
            "type": "string",
            "nullable": true,
            "example": "Sophomore"
          },
          "profileImage": {
            "type": "string",
            "nullable": true,
            "format": "uri"
          }
        }
      },
      "PublicUser": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "fullName": {
            "type": "string"
          },
          "department": {
            "type": "string",
            "nullable": true
          },
          "yearOfStudy": {
            "type": "string",
            "nullable": true
          },
          "bio": {
            "type": "string",
            "nullable": true
          },
          "profileImage": {
            "type": "string",
            "nullable": true
          },
          "preferredPickupZones": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "lenderRating": {
            "type": "number",
            "format": "float",
            "example": 4.5
          },
          "ratingsCount": {
            "type": "integer",
            "example": 12
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "borrowingCount": {
            "type": "integer",
            "example": 3
          },
          "listings": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "title": {
                  "type": "string"
                },
                "category": {
                  "type": "string"
                },
                "dailyRentalRate": {
                  "type": "number"
                },
                "createdAt": {
                  "type": "string",
                  "format": "date-time"
                }
              }
            }
          }
        }
      },
      "UserProfile": {
        "type": "object",
        "allOf": [
          {
            "$ref": "#/components/schemas/User"
          },
          {
            "type": "object",
            "properties": {
              "bio": {
                "type": "string",
                "nullable": true
              },
              "preferredPickupZones": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "lenderRating": {
                "type": "number",
                "format": "float"
              },
              "ratingsCount": {
                "type": "integer"
              },
              "createdAt": {
                "type": "string",
                "format": "date-time"
              },
              "borrowingCount": {
                "type": "integer",
                "example": 3
              },
              "listings": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "format": "uuid"
                    },
                    "title": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "active",
                        "hidden",
                        "paused"
                      ]
                    },
                    "createdAt": {
                      "type": "string",
                      "format": "date-time"
                    }
                  }
                }
              }
            }
          }
        ]
      },
      "AuthResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": true
          },
          "data": {
            "type": "object",
            "properties": {
              "token": {
                "type": "string",
                "example": "eyJhbGciOiJIUzI1NiIs..."
              },
              "user": {
                "$ref": "#/components/schemas/User"
              }
            }
          }
        }
      },
      "ListingImage": {
        "type": "object",
        "properties": {
          "imageUrl": {
            "type": "string",
            "format": "uri"
          },
          "displayOrder": {
            "type": "integer",
            "example": 0
          }
        }
      },
      "ListingOwner": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "fullName": {
            "type": "string"
          },
          "profileImage": {
            "type": "string",
            "nullable": true
          },
          "department": {
            "type": "string",
            "nullable": true
          },
          "lenderRating": {
            "type": "number",
            "format": "float"
          }
        }
      },
      "Listing": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "title": {
            "type": "string",
            "example": "MacBook Pro M2"
          },
          "description": {
            "type": "string"
          },
          "category": {
            "type": "string",
            "example": "Electronics"
          },
          "condition": {
            "type": "string",
            "example": "Like New"
          },
          "dailyRentalRate": {
            "type": "number",
            "example": 15
          },
          "securityDeposit": {
            "type": "number",
            "example": 200
          },
          "retailPrice": {
            "type": "number",
            "example": 2499
          },
          "minimumRentalDays": {
            "type": "integer",
            "example": 3
          },
          "preferredPickupZone": {
            "type": "string",
            "example": "Library"
          },
          "customPickupNote": {
            "type": "string",
            "nullable": true
          },
          "status": {
            "type": "string",
            "enum": [
              "active",
              "hidden",
              "paused",
              "deleted"
            ]
          },
          "ownerId": {
            "type": "string",
            "format": "uuid"
          },
          "owner": {
            "$ref": "#/components/schemas/ListingOwner"
          },
          "images": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ListingImage"
            }
          },
          "bookings": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "format": "uuid"
                },
                "startDate": {
                  "type": "string",
                  "format": "date-time"
                },
                "endDate": {
                  "type": "string",
                  "format": "date-time"
                },
                "status": {
                  "type": "string",
                  "enum": [
                    "approved",
                    "item_given",
                    "ongoing",
                    "return_pending"
                  ]
                }
              }
            }
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "Pagination": {
        "type": "object",
        "properties": {
          "total": {
            "type": "integer",
            "example": 50
          },
          "page": {
            "type": "integer",
            "example": 1
          },
          "limit": {
            "type": "integer",
            "example": 10
          },
          "totalPages": {
            "type": "integer",
            "example": 5
          }
        }
      },
      "Booking": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "startDate": {
            "type": "string",
            "format": "date-time"
          },
          "endDate": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string",
            "enum": [
              "requested",
              "approved",
              "item_given",
              "ongoing",
              "return_pending",
              "completed",
              "rejected",
              "cancelled"
            ]
          },
          "totalPriceSnapshot": {
            "type": "number",
            "example": 75
          },
          "securityDepositSnapshot": {
            "type": "number",
            "example": 200
          },
          "pickupZone": {
            "type": "string",
            "example": "Library"
          },
          "pickupTime": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "listingId": {
            "type": "string",
            "format": "uuid"
          },
          "borrowerId": {
            "type": "string",
            "format": "uuid"
          },
          "ownerId": {
            "type": "string",
            "format": "uuid"
          },
          "approvedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "returnedAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "cancelledAt": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "cancellationReason": {
            "type": "string",
            "nullable": true
          },
          "cancelledById": {
            "type": "string",
            "format": "uuid",
            "nullable": true
          },
          "listing": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "title": {
                "type": "string"
              },
              "securityDeposit": {
                "type": "number"
              },
              "images": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ListingImage"
                }
              }
            }
          },
          "borrower": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "fullName": {
                "type": "string"
              },
              "profileImage": {
                "type": "string",
                "nullable": true
              },
              "department": {
                "type": "string",
                "nullable": true
              }
            }
          },
          "cancelledBy": {
            "type": "object",
            "nullable": true,
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "fullName": {
                "type": "string"
              }
            }
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "AdminStats": {
        "type": "object",
        "properties": {
          "totalUsers": {
            "type": "integer",
            "example": 150
          },
          "totalListings": {
            "type": "integer",
            "example": 320
          },
          "activeListings": {
            "type": "integer",
            "example": 280
          },
          "totalBookings": {
            "type": "integer",
            "example": 450
          },
          "activeBookings": {
            "type": "integer",
            "example": 35
          },
          "completedBookings": {
            "type": "integer",
            "example": 380
          }
        }
      },
      "AdminUser": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "fullName": {
            "type": "string"
          },
          "collegeEmail": {
            "type": "string",
            "format": "email"
          },
          "role": {
            "type": "string",
            "enum": [
              "USER",
              "ADMIN"
            ]
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "AdminBooking": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "startDate": {
            "type": "string",
            "format": "date-time"
          },
          "endDate": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string"
          },
          "totalPriceSnapshot": {
            "type": "number"
          },
          "securityDepositSnapshot": {
            "type": "number"
          },
          "pickupZone": {
            "type": "string"
          },
          "pickupTime": {
            "type": "string",
            "nullable": true
          },
          "listingId": {
            "type": "string",
            "format": "uuid"
          },
          "borrowerId": {
            "type": "string",
            "format": "uuid"
          },
          "ownerId": {
            "type": "string",
            "format": "uuid"
          },
          "approvedAt": {
            "type": "string",
            "nullable": true
          },
          "returnedAt": {
            "type": "string",
            "nullable": true
          },
          "cancelledAt": {
            "type": "string",
            "nullable": true
          },
          "listing": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "title": {
                "type": "string"
              },
              "dailyRentalRate": {
                "type": "number"
              },
              "status": {
                "type": "string"
              }
            }
          },
          "borrower": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "format": "uuid"
              },
              "fullName": {
                "type": "string"
              },
              "collegeEmail": {
                "type": "string"
              }
            }
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    }
  },
  "paths": {
    "/health": {
      "get": {
        "tags": [
          "Health"
        ],
        "summary": "Health check",
        "description": "Returns server status, database connectivity, and uptime.",
        "operationId": "healthCheck",
        "responses": {
          "200": {
            "description": "Server is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "example": "ok"
                    },
                    "uptime": {
                      "type": "number",
                      "example": 3600
                    },
                    "database": {
                      "type": "string",
                      "example": "connected"
                    },
                    "timestamp": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "version": {
                      "type": "string",
                      "example": "1.0.0"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/auth/signup": {
      "post": {
        "tags": [
          "Authentication"
        ],
        "summary": "Register a new account",
        "description": "Creates a new user account with a @nitrr.ac.in email.",
        "operationId": "signup",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "fullName",
                  "collegeEmail",
                  "password"
                ],
                "properties": {
                  "fullName": {
                    "type": "string",
                    "example": "Alex Johnson"
                  },
                  "collegeEmail": {
                    "type": "string",
                    "format": "email",
                    "example": "ajohnson@nitrr.ac.in"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "example": "SecurePass1!"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Account created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AuthResponse"
                }
              }
            }
          },
          "400": {
            "description": "Validation failed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "409": {
            "description": "Email already exists",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "429": {
            "description": "Rate limit exceeded"
          }
        }
      }
    },
    "/api/auth/login": {
      "post": {
        "tags": [
          "Authentication"
        ],
        "summary": "Log in",
        "description": "Authenticates with email and password, returns JWT token.",
        "operationId": "login",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "collegeEmail",
                  "password"
                ],
                "properties": {
                  "collegeEmail": {
                    "type": "string",
                    "format": "email",
                    "example": "ajohnson@nitrr.ac.in"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "example": "SecurePass1!"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AuthResponse"
                }
              }
            }
          },
          "400": {
            "description": "Validation failed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "401": {
            "description": "Invalid credentials",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "429": {
            "description": "Rate limit exceeded"
          }
        }
      }
    },
    "/api/listings": {
      "get": {
        "tags": [
          "Listings"
        ],
        "summary": "List active listings",
        "description": "Public endpoint. Returns paginated active listings with search, category filter, and pagination.",
        "operationId": "getListings",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "description": "Search query (matches title, description, category)",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "category",
            "in": "query",
            "description": "Filter by category",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "description": "Page number (1-based)",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Items per page (max 100)",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 10
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Listings retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "count": {
                      "type": "integer",
                      "example": 10
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Listing"
                      }
                    },
                    "pagination": {
                      "$ref": "#/components/schemas/Pagination"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Listings"
        ],
        "summary": "Create a listing",
        "description": "Creates a new rental listing. Requires authentication.",
        "operationId": "createListing",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "title",
                  "description",
                  "category",
                  "condition",
                  "dailyRentalRate",
                  "securityDeposit",
                  "retailPrice",
                  "minimumRentalDays",
                  "preferredPickupZone"
                ],
                "properties": {
                  "title": {
                    "type": "string",
                    "maxLength": 120,
                    "example": "MacBook Pro M2"
                  },
                  "description": {
                    "type": "string",
                    "maxLength": 2000,
                    "example": "Excellent condition MacBook for rent."
                  },
                  "category": {
                    "type": "string",
                    "example": "Electronics"
                  },
                  "condition": {
                    "type": "string",
                    "example": "Like New"
                  },
                  "dailyRentalRate": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "example": 15
                  },
                  "securityDeposit": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "example": 200
                  },
                  "retailPrice": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "example": 2499
                  },
                  "minimumRentalDays": {
                    "type": "integer",
                    "minimum": 1,
                    "example": 3
                  },
                  "preferredPickupZone": {
                    "type": "string",
                    "example": "Library"
                  },
                  "customPickupNote": {
                    "type": "string",
                    "maxLength": 500,
                    "nullable": true
                  },
                  "images": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "imageUrl": {
                          "type": "string",
                          "format": "uri"
                        },
                        "displayOrder": {
                          "type": "integer",
                          "minimum": 0
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Listing created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/Listing"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Validation failed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/api/listings/my-listings": {
      "get": {
        "tags": [
          "Listings"
        ],
        "summary": "Get my listings",
        "description": "Returns all non-deleted listings owned by the authenticated user.",
        "operationId": "getMyListings",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "My listings retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Listing"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/api/listings/upload-image": {
      "post": {
        "tags": [
          "Listings"
        ],
        "summary": "Upload listing image",
        "description": "Uploads an image to Cloudinary. Requires authentication. Accepts multipart/form-data.",
        "operationId": "uploadListingImage",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "image": {
                    "type": "string",
                    "format": "binary",
                    "description": "Image file to upload"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Image uploaded",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "imageUrl": {
                          "type": "string",
                          "format": "uri"
                        },
                        "publicId": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        }
      }
    },
    "/api/listings/{id}": {
      "get": {
        "tags": [
          "Listings"
        ],
        "summary": "Get listing by ID",
        "description": "Returns a single listing with owner details, images, and active booking dates.",
        "operationId": "getListing",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "Listing ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Listing retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/Listing"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Listing not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Listings"
        ],
        "summary": "Update listing",
        "description": "Partially updates a listing. Only the owner can update.",
        "operationId": "updateListing",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "Listing ID"
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": {
                    "type": "string",
                    "maxLength": 120
                  },
                  "description": {
                    "type": "string",
                    "maxLength": 2000
                  },
                  "category": {
                    "type": "string"
                  },
                  "condition": {
                    "type": "string"
                  },
                  "dailyRentalRate": {
                    "type": "number",
                    "exclusiveMinimum": 0
                  },
                  "securityDeposit": {
                    "type": "number",
                    "exclusiveMinimum": 0
                  },
                  "retailPrice": {
                    "type": "number",
                    "exclusiveMinimum": 0
                  },
                  "minimumRentalDays": {
                    "type": "integer",
                    "minimum": 1
                  },
                  "preferredPickupZone": {
                    "type": "string"
                  },
                  "customPickupNote": {
                    "type": "string",
                    "nullable": true
                  },
                  "status": {
                    "type": "string",
                    "enum": [
                      "active",
                      "hidden",
                      "paused"
                    ]
                  },
                  "images": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "imageUrl": {
                          "type": "string"
                        },
                        "displayOrder": {
                          "type": "integer"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Listing updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/Listing"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Validation failed"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Not the owner"
          },
          "404": {
            "description": "Listing not found"
          }
        }
      },
      "delete": {
        "tags": [
          "Listings"
        ],
        "summary": "Delete listing (soft delete)",
        "description": "Soft-deletes a listing by setting status to deleted. Only the owner can delete.",
        "operationId": "deleteListing",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "Listing ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Listing deleted",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Not the owner"
          },
          "404": {
            "description": "Listing not found"
          }
        }
      }
    },
    "/api/bookings/my-bookings": {
      "get": {
        "tags": [
          "Bookings"
        ],
        "summary": "Get my bookings",
        "description": "Returns all bookings where the authenticated user is borrower or owner.",
        "operationId": "getMyBookings",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Bookings retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "borrowings": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/Booking"
                          }
                        },
                        "lending": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/Booking"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        }
      }
    },
    "/api/bookings": {
      "post": {
        "tags": [
          "Bookings"
        ],
        "summary": "Create a booking request",
        "description": "Creates a new booking request. Dates must not overlap with existing approved bookings.",
        "operationId": "createBooking",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "listingId",
                  "startDate",
                  "endDate"
                ],
                "properties": {
                  "listingId": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the listing to book"
                  },
                  "startDate": {
                    "type": "string",
                    "format": "date",
                    "example": "2026-06-20"
                  },
                  "endDate": {
                    "type": "string",
                    "format": "date",
                    "example": "2026-06-25"
                  },
                  "pickupZone": {
                    "type": "string",
                    "example": "Library",
                    "default": "Default Zone"
                  },
                  "pickupTime": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Booking created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/Booking"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Validation failed, self-booking, or invalid dates"
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Listing not found"
          },
          "409": {
            "description": "Date overlap conflict"
          }
        }
      }
    },
    "/api/bookings/{bookingId}/status": {
      "patch": {
        "tags": [
          "Bookings"
        ],
        "summary": "Update booking status",
        "description": "Transitions a booking through its lifecycle:\n\n`requested` → `approved` (owner) → `item_given` (owner) → `ongoing` (borrower) → `return_pending` (borrower) → `completed` (owner)\n\nAlso supports: `requested` → `rejected` (owner), `requested|approved` → `cancelled` (either party)",
        "operationId": "updateBookingStatus",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "bookingId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "Booking ID"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "status"
                ],
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "approved",
                      "item_given",
                      "ongoing",
                      "return_pending",
                      "completed",
                      "rejected",
                      "cancelled"
                    ],
                    "description": "Target booking status"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Status updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/Booking"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid status transition"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Not authorized to update this booking"
          },
          "404": {
            "description": "Booking not found"
          },
          "409": {
            "description": "Conflict - invalid state transition"
          }
        }
      }
    },
    "/api/users/me": {
      "get": {
        "tags": [
          "Users"
        ],
        "summary": "Get my profile",
        "description": "Returns the authenticated user's full profile including listings and borrowing count.",
        "operationId": "getMyProfile",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Profile retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/UserProfile"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        }
      }
    },
    "/api/users/{id}": {
      "get": {
        "tags": [
          "Users"
        ],
        "summary": "Get public user profile",
        "description": "Returns a public user profile with limited fields (no email, no role). Includes active listings.",
        "operationId": "getPublicProfile",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "User ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Public profile retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/PublicUser"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "User not found"
          }
        }
      }
    },
    "/api/admin/stats": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "Get admin dashboard stats",
        "description": "Returns aggregated platform statistics. Admin only.",
        "operationId": "adminGetStats",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Stats retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "$ref": "#/components/schemas/AdminStats"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden - not admin"
          }
        }
      }
    },
    "/api/admin/users": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List all users (admin)",
        "description": "Returns paginated list of all users with search. Admin only.",
        "operationId": "adminGetUsers",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "description": "Search by name or email",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 20,
              "maximum": 100
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Users retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "count": {
                      "type": "integer"
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/AdminUser"
                      }
                    },
                    "pagination": {
                      "$ref": "#/components/schemas/Pagination"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden - not admin"
          }
        }
      }
    },
    "/api/admin/bookings": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List all bookings (admin)",
        "description": "Returns paginated list of all bookings with optional filters. Admin only.",
        "operationId": "adminGetBookings",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "description": "Filter by booking status",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "userId",
            "in": "query",
            "description": "Filter by user (borrower or owner)",
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 20,
              "maximum": 100
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Bookings retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "count": {
                      "type": "integer"
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/AdminBooking"
                      }
                    },
                    "pagination": {
                      "$ref": "#/components/schemas/Pagination"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden - not admin"
          }
        }
      }
    },
    "/api/admin/listings/{id}/hide": {
      "patch": {
        "tags": [
          "Admin"
        ],
        "summary": "Hide a listing (admin)",
        "description": "Hides a listing from the marketplace. Cannot hide already deleted listings. Admin only.",
        "operationId": "adminHideListing",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "Listing ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Listing hidden",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "title": {
                          "type": "string"
                        },
                        "status": {
                          "type": "string",
                          "example": "hidden"
                        },
                        "updatedAt": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Cannot moderate deleted listing"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden - not admin"
          },
          "404": {
            "description": "Listing not found"
          }
        }
      }
    },
    "/api/admin/listings/{id}/restore": {
      "patch": {
        "tags": [
          "Admin"
        ],
        "summary": "Restore a listing (admin)",
        "description": "Restores a previously hidden listing back to active. Admin only.",
        "operationId": "adminRestoreListing",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "Listing ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Listing restored",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "title": {
                          "type": "string"
                        },
                        "status": {
                          "type": "string",
                          "example": "active"
                        },
                        "updatedAt": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Only hidden listings can be restored"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden - not admin"
          },
          "404": {
            "description": "Listing not found"
          }
        }
      }
    }
  }
};

export default swaggerJsdoc({ definition: swaggerDefinition, apis: [] });
