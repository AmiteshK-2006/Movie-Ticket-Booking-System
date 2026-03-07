const { redisClient } = require('../config/redis');
const LOCK_TTL = parseInt(process.env.SEAT_LOCK_TTL) || 30; // 30 seconds

/**
 * Redis Lock Service
 * Handles distributed locking for seat reservations
 */
class LockService {

  /**
   * Acquire lock for a single seat
   * @param {number} showId - Show ID
   * @param {number} seatId - Seat ID
   * @returns {Promise<boolean>} - True if lock acquired, false otherwise
   */
  static async acquireSeatLock(showId, seatId) {
    const lockKey = `seat_lock:${showId}:${seatId}`;
    
    try {
      // SET NX (set if not exists) with expiry
      // Returns 'OK' if lock acquired, null if already locked
      const result = await redisClient.set(lockKey, '1', {
        NX: true, // Only set if key doesn't exist
        EX: LOCK_TTL, // Expire after TTL seconds
      });
      
      return result === 'OK';
    } catch (error) {
      console.error(`Failed to acquire lock for seat ${seatId}:`, error);
      return false;
    }
  }




  /**
   * Acquire locks for multiple seats atomically
   * If any lock fails, release all acquired locks
   * @param {number} showId - Show ID
   * @param {number[]} seatIds - Array of seat IDs
   * @returns {Promise<{success: boolean, lockedSeats: number[]}>}
   */
  static async acquireMultipleSeatLocks(showId, seatIds) {
    const lockedSeats = [];
    
    try {
      // Try to acquire all locks
      for (const seatId of seatIds) {
        const acquired = await this.acquireSeatLock(showId, seatId);
        
        if (acquired) {
          lockedSeats.push(seatId);
        } else {
          // Lock acquisition failed - release all acquired locks
          await this.releaseMultipleSeatLocks(showId, lockedSeats);
          return {
            success: false,
            lockedSeats: [],
            failedSeat: seatId,
          };
        }
      }
      
      return {
        success: true,
        lockedSeats,
      };
    } catch (error) {
      // Error occurred - release all acquired locks
      await this.releaseMultipleSeatLocks(showId, lockedSeats);
      console.error('Error acquiring multiple seat locks:', error);
      return {
        success: false,
        lockedSeats: [],
        error: error.message,
      };
    }
  }




  /**
   * Release lock for a single seat
   * @param {number} showId - Show ID
   * @param {number} seatId - Seat ID
   * @returns {Promise<boolean>}
   */
  static async releaseSeatLock(showId, seatId) {
    const lockKey = `seat_lock:${showId}:${seatId}`;
    
    try {
      await redisClient.del(lockKey);
      return true;
    } catch (error) {
      console.error(`Failed to release lock for seat ${seatId}:`, error);
      return false;
    }
  }




  /**
   * Release locks for multiple seats
   * @param {number} showId - Show ID
   * @param {number[]} seatIds - Array of seat IDs
   * @returns {Promise<void>}
   */
  static async releaseMultipleSeatLocks(showId, seatIds) {
    try {
      const lockKeys = seatIds.map(seatId => `seat_lock:${showId}:${seatId}`);
      
      if (lockKeys.length > 0) {
        await redisClient.del(lockKeys);
      }
    } catch (error) {
      console.error('Error releasing multiple seat locks:', error);
    }
  }




  /**
   * Check if a seat is locked
   * @param {number} showId - Show ID
   * @param {number} seatId - Seat ID
   * @returns {Promise<boolean>}
   */
  static async isSeatLocked(showId, seatId) {
    const lockKey = `seat_lock:${showId}:${seatId}`;
    
    try {
      const exists = await redisClient.exists(lockKey);
      return exists === 1;
    } catch (error) {
      console.error(`Failed to check lock for seat ${seatId}:`, error);
      return false;
    }
  }




  /**
   * Extend lock TTL for a seat (if user needs more time)
   * @param {number} showId - Show ID
   * @param {number} seatId - Seat ID
   * @returns {Promise<boolean>}
   */
  static async extendSeatLock(showId, seatId) {
    const lockKey = `seat_lock:${showId}:${seatId}`;
    
    try {
      const result = await redisClient.expire(lockKey, LOCK_TTL);
      return result === 1; // Returns 1 if expiry was set
    } catch (error) {
      console.error(`Failed to extend lock for seat ${seatId}:`, error);
      return false;
    }
  }
}

module.exports = LockService;
