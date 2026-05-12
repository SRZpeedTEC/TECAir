using Microsoft.AspNetCore.Mvc;
using Npgsql;
using TECAir.Application.DTOs.Baggages;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller de maletas.
// Traduce los resultados del servicio a HTTP sin ejecutar SQL directamente.
[ApiController]
[Route("baggages")]
[Route("api/baggages")]
public class BaggagesController(IBaggageService baggageService) : ControllerBase
{
    // GET /baggages/{bagNumber}
    [HttpGet("{bagNumber:int}")]
    public async Task<ActionResult<BaggageResponse>> GetByBagNumber(
        int bagNumber,
        CancellationToken cancellationToken)
    {
        var baggage = await baggageService.GetByBagNumberAsync(bagNumber, cancellationToken);
        if (baggage is null)
        {
            return NotFound(new { message = $"Baggage '{bagNumber}' was not found." });
        }

        return Ok(baggage);
    }

    // GET /check-ins/{confirmationNumber}/baggages
    [HttpGet("~/check-ins/{confirmationNumber:int}/baggages")]
    [HttpGet("~/api/check-ins/{confirmationNumber:int}/baggages")]
    public async Task<ActionResult<IReadOnlyList<BaggageResponse>>> GetByConfirmationNumber(
        int confirmationNumber,
        CancellationToken cancellationToken)
    {
        var result = await baggageService.GetByConfirmationNumberAsync(
            confirmationNumber,
            cancellationToken);
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.ErrorMessage });
        }

        return Ok(result.Baggages);
    }

    // POST /baggages
    [HttpPost]
    public async Task<ActionResult<BaggageResponse>> Create(
        CreateBaggageRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await baggageService.CreateAsync(request, cancellationToken);
            if (!result.IsSuccess)
            {
                if (result.IsNotFound)
                {
                    return NotFound(new { message = result.ErrorMessage });
                }

                if (result.IsConflict)
                {
                    return Conflict(new { message = result.ErrorMessage });
                }

                return BadRequest(new { message = result.ErrorMessage });
            }

            return Created($"/baggages/{result.Baggage!.BagNumber}", result.Baggage);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new { message = "The baggage references a check-in that does not exist." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.CheckViolation)
        {
            return BadRequest(new { message = "The baggage data violates a database constraint." });
        }
    }

    // PUT /baggages/{bagNumber}
    [HttpPut("{bagNumber:int}")]
    public async Task<ActionResult<BaggageResponse>> Update(
        int bagNumber,
        UpdateBaggageRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await baggageService.UpdateAsync(bagNumber, request, cancellationToken);
            if (!result.IsSuccess)
            {
                if (result.IsNotFound)
                {
                    return NotFound(new { message = result.ErrorMessage });
                }

                if (result.IsConflict)
                {
                    return Conflict(new { message = result.ErrorMessage });
                }

                return BadRequest(new { message = result.ErrorMessage });
            }

            return Ok(result.Baggage);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.CheckViolation)
        {
            return BadRequest(new { message = "The baggage data violates a database constraint." });
        }
    }

    // DELETE /baggages/{bagNumber}
    [HttpDelete("{bagNumber:int}")]
    public async Task<IActionResult> Delete(
        int bagNumber,
        CancellationToken cancellationToken)
    {
        var result = await baggageService.DeleteAsync(bagNumber, cancellationToken);
        if (!result.IsSuccess)
        {
            if (result.IsNotFound)
            {
                return NotFound(new { message = result.ErrorMessage });
            }

            if (result.IsConflict)
            {
                return Conflict(new { message = result.ErrorMessage });
            }
        }

        return NoContent();
    }
}
