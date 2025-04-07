/**
 * Unit tests for the BaseService class
 */

// Create mock logger functions before imports
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock logger
jest.mock('@shared/logger', () => mockLogger);

// Mock database before requiring the module
jest.mock('@shared/database', () => ({
  getInstance: jest.fn().mockResolvedValue({
    getGuilds: jest.fn().mockResolvedValue([
      { id: '123456789012345678', channel_id: '111222333444555666', webhook_url: 'https://discord.com/api/webhooks/123/abc' },
      { id: '876543210987654321', channel_id: '999888777666555444', webhook_url: 'https://discord.com/api/webhooks/456/def' }
    ]),
    getGuild: jest.fn().mockImplementation((guildId) => {
      if (guildId === '123456789012345678') {
        return Promise.resolve({ 
          id: '123456789012345678', 
          channel_id: '111222333444555666', 
          webhook_url: 'https://discord.com/api/webhooks/123/abc' 
        });
      }
      return Promise.resolve(null);
    }),
    _validateDateFormat: jest.fn().mockImplementation((date) => date),
    _ensureString: jest.fn().mockImplementation((id) => id ? String(id) : null),
    _safeQuery: jest.fn().mockImplementation((query, params, errorMessage) => Promise.resolve({}))
  })
}));

// Import after mocks
const BaseService = require('../../../src/services/baseService');

describe('BaseService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getDatabase method', () => {
    it('should return a database instance', async () => {
      const dbInstance = await BaseService.getDatabase();
      
      expect(require('@shared/database').getInstance).toHaveBeenCalled();
      expect(dbInstance).toBeDefined();
    });
  });
  
  describe('executeMethod method', () => {
    it('should execute the service method and return its result', async () => {
      const mockServiceMethod = jest.fn().mockResolvedValue('test result');
      const result = await BaseService.executeMethod(mockServiceMethod, 'testOperation', 'arg1', 'arg2');
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Executing service operation: testOperation');
      expect(mockServiceMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('test result');
    });
    
    it('should log error and rethrow when service method fails', async () => {
      const testError = new Error('Test error');
      const mockServiceMethod = jest.fn().mockRejectedValue(testError);
      
      await expect(BaseService.executeMethod(mockServiceMethod, 'failOperation'))
        .rejects.toThrow(testError);
        
      expect(mockLogger.error).toHaveBeenCalledWith('Error in service operation failOperation: Test error');
    });
  });
  
  describe('safelyConvertToString method', () => {
    it('should convert value to string', () => {
      expect(BaseService.safelyConvertToString(123)).toBe('123');
      expect(BaseService.safelyConvertToString('abc')).toBe('abc');
      expect(BaseService.safelyConvertToString(BigInt(12345))).toBe('12345');
    });
    
    it('should handle null and undefined', () => {
      expect(BaseService.safelyConvertToString(null)).toBeNull();
      expect(BaseService.safelyConvertToString(undefined)).toBeNull();
    });
  });
  
  describe('validateId method', () => {
    it('should not throw error for valid id', () => {
      expect(() => BaseService.validateId('123')).not.toThrow();
      expect(() => BaseService.validateId(123)).not.toThrow();
      expect(() => BaseService.validateId('abc')).not.toThrow();
    });
    
    it('should throw error for empty id', () => {
      expect(() => BaseService.validateId('')).toThrow('ID is required');
      expect(() => BaseService.validateId(null)).toThrow('ID is required');
      expect(() => BaseService.validateId(undefined)).toThrow('ID is required');
    });
    
    it('should use custom name in error message when provided', () => {
      expect(() => BaseService.validateId('', 'Guild ID')).toThrow('Guild ID is required');
    });
  });
});