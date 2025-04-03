/**
 * Base class for application errors
 */
class ApplicationError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error for when a resource is not found
 */
class NotFoundError extends ApplicationError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

/**
 * Error for unauthorized access attempts
 */
class UnauthorizedError extends ApplicationError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
    }
}

/**
 * Error for forbidden access attempts
 */
class ForbiddenError extends ApplicationError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
    }
}

/**
 * Error for validation failures
 */
class ValidationError extends ApplicationError {
    constructor(message, validationErrors = {}) {
        super(message, 400);
        this.validationErrors = validationErrors;
    }
}

module.exports = {
    ApplicationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ValidationError
};