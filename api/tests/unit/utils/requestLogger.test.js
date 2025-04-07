/**
 * Unit tests for the request logger middleware
 */
const httpMocks = require('node-mocks-http');

// Manual mock for the logger before requiring other modules
const mockLoggerFns = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Override the existing mock from setup.js
jest.mock('@shared/logger', () => mockLoggerFns);

// Mock crypto for consistent request IDs in tests
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({ toString: () => 'mock-request-id' })
}));

// Import after mocks are set up
const requestLogger = require('../../../src/utils/requestLogger');

describe('Request Logger Middleware Tests', () => {
  beforeEach(() => {
    // Clear all mock calls between tests
    jest.clearAllMocks();
  });
  
  it('should add a requestId to the request object', () => {
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    });
    const next = jest.fn();
    
    requestLogger(req, res, next);
    
    expect(req.requestId).toBe('mock-request-id');
    expect(next).toHaveBeenCalled();
  });
  
  it('should log incoming requests with appropriate info', () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/guilds',
      query: { page: '1' },
      params: { id: '123' },
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    });
    const res = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    });
    const next = jest.fn();
    
    requestLogger(req, res, next);
    
    expect(mockLoggerFns.info).toHaveBeenCalledWith(
      expect.stringContaining('Request received'),
      expect.objectContaining({
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        query: { page: '1' },
        params: { id: '123' }
      })
    );
  });
  
  it('should log successful responses on finish', () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/guilds'
    });
    const res = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    });
    const next = jest.fn();
    
    // Store real Date.now to restore it later
    const originalDateNow = Date.now;
    Date.now = jest.fn()
      .mockReturnValueOnce(1000) // First call for startTime
      .mockReturnValueOnce(1500); // Second call for calculation
    
    requestLogger(req, res, next);
    
    // Set response properties before emitting finish event
    res.statusCode = 200;
    res.statusMessage = 'OK';
    
    // Emit finish event
    res.emit('finish');
    
    expect(mockLoggerFns.info).toHaveBeenCalledWith(
      expect.stringContaining('[mock-request-id] GET /api/guilds - 200 OK - 500ms'),
    );
    
    // Restore Date.now
    Date.now = originalDateNow;
  });
  
  it('should log error responses as warnings', () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/guilds/invalid'
    });
    const res = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    });
    const next = jest.fn();
    
    // Store real Date.now to restore it later
    const originalDateNow = Date.now;
    Date.now = jest.fn()
      .mockReturnValueOnce(1000) // First call for startTime
      .mockReturnValueOnce(1200); // Second call for calculation
    
    requestLogger(req, res, next);
    
    // Set response properties before emitting finish event
    res.statusCode = 404;
    res.statusMessage = 'Not Found';
    
    // Emit finish event
    res.emit('finish');
    
    expect(mockLoggerFns.warn).toHaveBeenCalledWith(
      expect.stringContaining('[mock-request-id] GET /api/guilds/invalid - 404 Not Found - 200ms'),
    );
    
    // Restore Date.now
    Date.now = originalDateNow;
  });
});