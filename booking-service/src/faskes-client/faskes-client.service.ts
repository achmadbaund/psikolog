import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface FaskesInfo {
  id: string;
  nama_faskes: string;
  alamat: string;
  jenis_faskes: string;
}

export interface DoctorInfo {
  id: string;
  nama_dokter: string;
  spesialisasi: string;
  faskes_id: string;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

@Injectable()
export class FaskesClientService {
  private readonly logger = new Logger(FaskesClientService.name);

  // Circuit Breaker State
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  // Circuit Breaker Configuration
  private readonly FAILURE_THRESHOLD = 3; // Open circuit after 3 consecutive failures
  private readonly COOLDOWN_PERIOD = 10000; // 10 seconds in OPEN before HALF-OPEN
  private readonly TIMEOUT = 2000; // 2 seconds
  private readonly HALF_OPEN_MAX_CALLS = 3; // Max calls allowed in HALF-OPEN state
  private halfOpenCallCount = 0;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get Faskes information with circuit breaker protection
   */
  async getFaskesInfo(faskesId: string): Promise<FaskesInfo> {
    // Check if circuit is OPEN and we should fail fast
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.logger.warn('⚡ Circuit is OPEN - Failing fast with fallback');
        return this.getFallbackFaskesInfo(faskesId);
      } else {
        // Transition to HALF-OPEN
        this.transitionToHalfOpen();
      }
    }

    try {
      this.logger.log(`Fetching Faskes info for ID: ${faskesId}`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await firstValueFrom(
        this.httpService.get<any>(
          `http://faskes-service:8009/faskes/${faskesId}`,
          { signal: controller.signal }
        )
      );

      clearTimeout(timeoutId);

      // Extract faskes data from response (Faskes API wraps it in "data" property)
      const faskesData = response.data?.data || response.data;

      // Record success
      this.recordSuccess();

      this.logger.log(`Faskes data received: ${JSON.stringify(faskesData)}`);

      return faskesData as FaskesInfo;
    } catch (error) {
      // Record failure
      this.recordFailure();

      // Fallback: Return default faskes info when service is down
      this.logger.warn(`Using fallback for Faskes ${faskesId}: ${error.message}`);
      return this.getFallbackFaskesInfo(faskesId);
    }
  }

  /**
   * Get Doctor information with circuit breaker protection
   */
  async getDoctorInfo(doctorId: string): Promise<DoctorInfo> {
    // Check if circuit is OPEN and we should fail fast
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.logger.warn('⚡ Circuit is OPEN - Failing fast with fallback');
        return this.getFallbackDoctorInfo(doctorId);
      } else {
        // Transition to HALF-OPEN
        this.transitionToHalfOpen();
      }
    }

    try {
      this.logger.log(`Fetching Doctor info for ID: ${doctorId}`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await firstValueFrom(
        this.httpService.get<DoctorInfo>(
          `http://faskes-service:8009/dokter/${doctorId}`,
          { signal: controller.signal }
        )
      );

      clearTimeout(timeoutId);

      // Record success
      this.recordSuccess();

      return response.data;
    } catch (error) {
      // Record failure
      this.recordFailure();

      // Fallback: Return default doctor info when service is down
      this.logger.warn(`Using fallback for Doctor ${doctorId}: ${error.message}`);
      return this.getFallbackDoctorInfo(doctorId);
    }
  }

  /**
   * Check if doctor belongs to faskes with circuit breaker protection
   */
  async validateDoctorInFaskes(doctorId: string, faskesId: string): Promise<boolean> {
    // Check if circuit is OPEN and we should fail fast
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.logger.warn('⚡ Circuit is OPEN - Failing fast with fallback');
        return true; // Optimistic fallback
      } else {
        // Transition to HALF-OPEN
        this.transitionToHalfOpen();
      }
    }

    try {
      this.logger.log(`Validating doctor ${doctorId} in faskes ${faskesId}`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await firstValueFrom(
        this.httpService.get(
          `http://faskes-service:8009/faskes/${faskesId}/dokter/${doctorId}`,
          { signal: controller.signal }
        )
      );

      clearTimeout(timeoutId);

      // Record success
      this.recordSuccess();

      return response.status === 200;
    } catch (error) {
      // Record failure
      this.recordFailure();

      // Fallback: Assume validation passes when service is down
      this.logger.warn(`Using fallback for doctor validation: ${error.message}`);
      return true; // Optimistic fallback
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess() {
    this.failureCount = 0;
    this.successCount++;

    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.halfOpenCallCount++;
      this.logger.log(`✅ HALF-OPEN: Success ${this.halfOpenCallCount}/${this.HALF_OPEN_MAX_CALLS}`);

      // If we get enough successes in HALF-OPEN, close the circuit
      if (this.halfOpenCallCount >= this.HALF_OPEN_MAX_CALLS) {
        this.transitionToClosed();
      }
    } else if (this.circuitState === CircuitState.CLOSED) {
      this.logger.log('✅ Circuit is CLOSED - Request successful');
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === CircuitState.HALF_OPEN) {
      // Failure in HALF-OPEN means service is still down
      this.logger.error(`❌ HALF-OPEN failure - Opening circuit again`);
      this.transitionToOpen();
    } else if (this.failureCount >= this.FAILURE_THRESHOLD) {
      // Too many failures - open the circuit
      this.logger.error(`❌ ${this.failureCount} consecutive failures - Opening circuit`);
      this.transitionToOpen();
    } else {
      this.logger.warn(`⚠️ Failure ${this.failureCount}/${this.FAILURE_THRESHOLD} - Circuit still CLOSED`);
    }
  }

  /**
   * Transition circuit to CLOSED state
   */
  private transitionToClosed() {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCallCount = 0;
    this.logger.log('✅✅✅ Circuit Breaker transitioned to CLOSED - Service is healthy');
  }

  /**
   * Transition circuit to OPEN state
   */
  private transitionToOpen() {
    this.circuitState = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.COOLDOWN_PERIOD;
    this.logger.error('❌❌❌ Circuit Breaker transitioned to OPEN - Failing fast');
  }

  /**
   * Transition circuit to HALF-OPEN state
   */
  private transitionToHalfOpen() {
    this.circuitState = CircuitState.HALF_OPEN;
    this.halfOpenCallCount = 0;
    this.logger.warn('🔶🔶🔶 Circuit Breaker transitioned to HALF-OPEN - Testing recovery');
  }

  /**
   * Get circuit breaker state (for monitoring/health checks)
   */
  getCircuitBreakerState(): string {
    return this.circuitState;
  }

  /**
   * Get detailed circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null,
      configuration: {
        failureThreshold: this.FAILURE_THRESHOLD,
        cooldownPeriod: this.COOLDOWN_PERIOD,
        timeout: this.TIMEOUT,
        halfOpenMaxCalls: this.HALF_OPEN_MAX_CALLS
      }
    };
  }

  /**
   * Fallback: Default faskes information
   */
  private getFallbackFaskesInfo(faskesId: string): FaskesInfo {
    return {
      id: faskesId,
      nama_faskes: 'Faskes Service Unavailable',
      alamat: 'Service temporarily unavailable',
      jenis_faskes: 'UNKNOWN',
    };
  }

  /**
   * Fallback: Default doctor information
   */
  private getFallbackDoctorInfo(doctorId: string): DoctorInfo {
    return {
      id: doctorId,
      nama_dokter: 'Doctor Service Unavailable',
      spesialisasi: 'UNKNOWN',
      faskes_id: '',
    };
  }

  /**
   * Reset circuit breaker (for testing purposes)
   */
  resetCircuitBreaker() {
    this.logger.log('🔄 Circuit Breaker reset manually');
    this.transitionToClosed();
  }
}
