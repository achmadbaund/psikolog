import { Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FaskesClientService } from '../faskes-client/faskes-client.service';

@ApiTags('Resilience & Circuit Breaker')
@Controller('resilience')
export class ResilienceController {
  constructor(private readonly faskesClientService: FaskesClientService) {}

  /**
   * Health check endpoint for circuit breaker monitoring
   */
  @Get('circuit-breaker/status')
  @ApiOperation({
    summary: 'Get Circuit Breaker Status',
    description: `
      **Circuit Breaker State Monitoring**

      This endpoint provides the current status of the circuit breaker for Faskes service integration.

      **States:**
      - **CLOSED**: Normal operation, all requests are processed
      - **OPEN**: Service is failing, requests are blocked (fail fast)
      - **HALF_OPEN**: Testing if service has recovered

      **Configuration:**
      - Threshold: 3 consecutive failures opens the circuit
      - Cooldown: 10 seconds before moving to HALF-OPEN
      - Timeout: 2 seconds per request
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Circuit breaker status retrieved successfully'
  })
  getCircuitBreakerStatus() {
    return this.faskesClientService.getCircuitBreakerStatus();
  }

  /**
   * Test circuit breaker by calling Faskes service
   */
  @Get('circuit-breaker/test/:faskesId')
  @ApiOperation({
    summary: 'Test Circuit Breaker with Faskes Service',
    description: `
      **Test Circuit Breaker Behavior**

      This endpoint tests the circuit breaker by calling the Faskes service.
      Use this to observe circuit breaker state transitions.

      **Testing Scenarios:**
      1. **Normal Operation**: All requests succeed (200 OK)
      2. **Failure Simulation**: Stop faskes-service, observe 3 failures → OPEN
      3. **Recovery Test**: Wait 10s, restart faskes-service, observe HALF-OPEN → CLOSED
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Faskes service response (circuit CLOSED or fallback)'
  })
  async testCircuitBreaker(@Param('faskesId') faskesId: string) {
    try {
      const faskesInfo = await this.faskesClientService.getFaskesInfo(faskesId);

      // Check if we got fallback data
      const isFallback = faskesInfo?.nama_faskes?.includes('Unavailable') || false;

      return {
        success: true,
        data: faskesInfo,
        circuitState: this.faskesClientService.getCircuitBreakerState(),
        message: isFallback
          ? 'Circuit is OPEN or HALF-OPEN - Using fallback data'
          : 'Circuit is CLOSED - Request processed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        circuitState: this.faskesClientService.getCircuitBreakerState(),
        message: 'Request failed with exception'
      };
    }
  }

  /**
   * Reset circuit breaker (for testing)
   */
  @Post('circuit-breaker/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset Circuit Breaker',
    description: `
      **Reset Circuit Breaker State**

      Manually reset the circuit breaker for testing purposes.
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Circuit breaker reset successfully'
  })
  resetCircuitBreaker() {
    this.faskesClientService.resetCircuitBreaker();
    return {
      message: 'Circuit breaker reset successfully',
      circuitState: this.faskesClientService.getCircuitBreakerState(),
      action: 'Circuit returned to CLOSED state'
    };
  }

  /**
   * Get resilience configuration
   */
  @Get('config')
  @ApiOperation({
    summary: 'Get Resilience Configuration',
    description: 'Get the complete resilience configuration including timeout, circuit breaker settings'
  })
  @ApiResponse({
    status: 200,
    description: 'Resilience configuration retrieved successfully'
  })
  getResilienceConfig() {
    return {
      circuitBreaker: {
        threshold: 3,
        cooldownPeriod: 10000,
        halfOpenMaxCalls: 3,
        description: 'Opens after 3 consecutive failures, moves to HALF-OPEN after 10s'
      },
      timeout: {
        duration: 2000,
        strategy: 'Aggressive',
        description: 'Fails fast after 2 seconds without response'
      },
      fallback: {
        enabled: true,
        description: 'Returns default data when service is unavailable'
      }
    };
  }
}
