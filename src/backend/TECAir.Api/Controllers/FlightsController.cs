using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Este controller expone los endpoints HTTP de vuelos.
// La logica de negocio queda en FlightService; aqui solo se traducen resultados
// a respuestas como 201 Created, 400 Bad Request, 404 Not Found o 409 Conflict.
[ApiController]
[Route("api/flights")]
public class FlightsController(IFlightService flightService) : ControllerBase
{
    // POST /api/flights
    // Recibe el DTO del body y delega la creacion al servicio de aplicacion.
    [HttpPost]
    public async Task<ActionResult<FlightResponse>> Create(
        CreateFlightRequest request,
        CancellationToken cancellationToken)
    {
        var result = await flightService.CreateAsync(request, cancellationToken);
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

        return Created($"/api/flights/{result.Flight!.FlightId}", result.Flight);
    }

    // GET /api/flights/open/?departureCode=XXX
    // Consulta vuelos disponibles por aeropuerto de salida usando query string.
    [HttpGet("open")]
    public async Task<ActionResult<IReadOnlyList<OpenFlightResponse>>> GetOpenByDepartureAirport(
        [FromQuery] string? departureCode,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(departureCode))
        {
            return BadRequest(new { message = "Query parameter 'departureCode' is required." });
        }

        var flights = await flightService.GetOpenByDepartureAirportAsync(departureCode, cancellationToken);
        return Ok(flights);
    }

    // GET /api/flights/available?originCode=...&destinationCode=...&flightId=...
    // Consulta vuelos disponibles: UPCOMING u OPEN, con filtros opcionales.
    [HttpGet("available")]
    public async Task<ActionResult<IReadOnlyList<AvailableFlightResponse>>> GetAvailable(
        [FromQuery] string? originCode,
        [FromQuery] string? destinationCode,
        [FromQuery] int? flightId,
        CancellationToken cancellationToken)
    {
        if (flightId.HasValue && flightId.Value <= 0)
        {
            return BadRequest(new { message = "Flight id must be greater than 0." });
        }

        var flights = await flightService.GetAvailableAsync(
            originCode,
            destinationCode,
            flightId,
            cancellationToken);

        return Ok(flights);
    }

    // PUT /api/flights/{flightId}
    // Actualiza el vuelo sin permitir cambios al flight_id.
    [HttpPut("{flightId:int}")]
    public async Task<ActionResult<FlightResponse>> Update(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken)
    {
        var result = await flightService.UpdateAsync(flightId, request, cancellationToken);
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

        return Ok(result.Flight);
    }

    // PATCH /api/flights/{flightId}/state
    // Actualiza unicamente el estado del vuelo.
    [HttpPatch("{flightId:int}/state")]
    public async Task<ActionResult<FlightResponse>> UpdateState(
        int flightId,
        UpdateFlightStateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await flightService.UpdateStateAsync(flightId, request, cancellationToken);
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

        return Ok(result.Flight);
    }

    // DELETE /api/flights/{flightId}
    // No borra vuelos usados por itinerarios para proteger rutas existentes.
    [HttpDelete("{flightId:int}")]
    public async Task<IActionResult> Delete(
        int flightId,
        CancellationToken cancellationToken)
    {
        var result = await flightService.DeleteAsync(flightId, cancellationToken);
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
