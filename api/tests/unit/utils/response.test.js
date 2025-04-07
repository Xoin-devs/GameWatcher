/**
 * Unit tests for the response utility functions
 */
const { success, error, responseMiddleware } = require('../../../src/utils/response');
const httpMocks = require('node-mocks-http');

describe('Response Utility Tests', () => {
  describe('success() function', () => {
    it('should create a success response with default values', () => {
      const data = { test: 'data' };
      const result = success(data);
      
      expect(result).toEqual({
        success: true,
        message: 'Operation successful',
        statusCode: 200,
        data: { test: 'data' }
      });
    });
    
    it('should create a success response with custom message and status', () => {
      const data = { test: 'data' };
      const result = success(data, 'Custom message', 201);
      
      expect(result).toEqual({
        success: true,
        message: 'Custom message',
        statusCode: 201,
        data: { test: 'data' }
      });
    });
  });
  
  describe('error() function', () => {
    it('should create an error response with default values', () => {
      const result = error();
      
      expect(result).toEqual({
        success: false,
        message: 'An error occurred',
        statusCode: 400
      });
    });
    
    it('should create an error response with custom message and status', () => {
      const result = error('Custom error', 404);
      
      expect(result).toEqual({
        success: false,
        message: 'Custom error',
        statusCode: 404
      });
    });
    
    it('should include errors details when provided', () => {
      const errors = { field: ['Error message'] };
      const result = error('Validation error', 422, errors);
      
      expect(result).toEqual({
        success: false,
        message: 'Validation error',
        statusCode: 422,
        errors: { field: ['Error message'] }
      });
    });
  });
  
  describe('responseMiddleware', () => {
    it('should add sendSuccess method to response object', () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      const next = jest.fn();
      
      responseMiddleware(req, res, next);
      
      expect(typeof res.sendSuccess).toBe('function');
      expect(next).toHaveBeenCalled();
    });
    
    it('should add sendError method to response object', () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      const next = jest.fn();
      
      responseMiddleware(req, res, next);
      
      expect(typeof res.sendError).toBe('function');
      expect(next).toHaveBeenCalled();
    });
    
    it('should send success response when sendSuccess is called', () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      });
      const next = jest.fn();
      
      responseMiddleware(req, res, next);
      
      res.sendSuccess({ id: 1 }, 'Success message', 201);
      
      const data = JSON.parse(res._getData());
      expect(res._getStatusCode()).toBe(201);
      expect(data).toEqual({
        success: true,
        message: 'Success message',
        statusCode: 201,
        data: { id: 1 }
      });
    });
    
    it('should send error response when sendError is called', () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      });
      const next = jest.fn();
      
      responseMiddleware(req, res, next);
      
      res.sendError('Error message', 400, { field: 'Invalid' });
      
      const data = JSON.parse(res._getData());
      expect(res._getStatusCode()).toBe(400);
      expect(data).toEqual({
        success: false,
        message: 'Error message',
        statusCode: 400,
        errors: { field: 'Invalid' }
      });
    });
  });
});