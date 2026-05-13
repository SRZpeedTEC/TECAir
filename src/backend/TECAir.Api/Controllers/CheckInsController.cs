using Microsoft.AspNetCore.Mvc;
using Npgsql;
using TECAir.Application.DTOs.CheckIns;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller de check-in.
// Mantiene fuera el SQL y las reglas fuertes de negocio.
[ApiController]
[Route("check-ins")]
[Route("api/check-ins")]
public class CheckInsController(ICheckInService checkInService) : ControllerBase
{
    // GET /check-ins/{confirmationNumber}
    [HttpGet("{confirmationNumber:int}")]
    public async Task<ActionResult<CheckInResponse>> GetByConfirmationNumber(
        int confirmationNumber,
        CancellationToken cancellationToken)
    {
        var checkIn = await checkInService.GetByConfirmationNumberAsync(
            confirmationNumber,
            cancellationToken);
        if (checkIn is null)
        {
            return NotFound(new { message = $"Check-in '{confirmationNumber}' was not found." });
        }

        return Ok(checkIn);
    }

    // GET /reservations/{reservationId}/check-ins
    [HttpGet("~/reservations/{reservationId:int}/check-ins")]
    [HttpGet("~/api/reservations/{reservationId:int}/check-ins")]
    public async Task<ActionResult<IReadOnlyList<CheckInResponse>>> GetByReservationId(
        int reservationId,
        CancellationToken cancellationToken)
    {
        var result = await checkInService.GetByReservationIdAsync(reservationId, cancellationToken);
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.ErrorMessage });
        }

        return Ok(result.CheckIns);
    }

    // POST /check-ins
    [HttpPost]
    public async Task<ActionResult<CheckInResponse>> Create(
        CreateCheckInRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await checkInService.CreateAsync(request, cancellationToken);
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

            return Created(
                $"/check-ins/{result.CheckIn!.ConfirmationNumber}",
                result.CheckIn);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "The seat is already taken or the reservation already has check-in for that flight." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new { message = "The check-in references related data that does not exist." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.CheckViolation)
        {
            return BadRequest(new { message = "The check-in data violates a database constraint." });
        }
    }

    // PUT /check-ins/{confirmationNumber}
    [HttpPut("{confirmationNumber:int}")]
    public async Task<ActionResult<CheckInResponse>> UpdateSeat(
        int confirmationNumber,
        UpdateCheckInSeatRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await checkInService.UpdateSeatAsync(
                confirmationNumber,
                request,
                cancellationToken);
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

            return Ok(result.CheckIn);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "The seat is already taken for that itinerary flight." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new { message = "The check-in references related data that does not exist." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.CheckViolation)
        {
            return BadRequest(new { message = "The check-in data violates a database constraint." });
        }
    }

    // DELETE /check-ins/{confirmationNumber}
    [HttpDelete("{confirmationNumber:int}")]
    public async Task<IActionResult> Delete(
        int confirmationNumber,
        CancellationToken cancellationToken)
    {
        var result = await checkInService.DeleteAsync(confirmationNumber, cancellationToken);
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
