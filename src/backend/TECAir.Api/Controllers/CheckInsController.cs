using Microsoft.AspNetCore.Mvc;
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

    // PUT /check-ins/{confirmationNumber}
    [HttpPut("{confirmationNumber:int}")]
    public async Task<ActionResult<CheckInResponse>> UpdateSeat(
        int confirmationNumber,
        UpdateCheckInSeatRequest request,
        CancellationToken cancellationToken)
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
