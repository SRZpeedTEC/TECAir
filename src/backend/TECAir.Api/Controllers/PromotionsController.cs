using Microsoft.AspNetCore.Mvc;
using Npgsql;
using TECAir.Application.DTOs.Promotions;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller de promociones.
// Recibe requests, llama al servicio y traduce resultados a respuestas HTTP.
[ApiController]
[Route("promotions")]
[Route("api/promotions")]
public class PromotionsController(IPromotionService promotionService) : ControllerBase
{
    // GET /promotions
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PromotionResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var promotions = await promotionService.GetAllAsync(cancellationToken);
        return Ok(promotions);
    }

    // GET /promotions/{promotionCode}
    [HttpGet("{promotionCode}")]
    public async Task<ActionResult<PromotionResponse>> GetByCode(
        string promotionCode,
        CancellationToken cancellationToken)
    {
        var promotion = await promotionService.GetByCodeAsync(promotionCode, cancellationToken);
        if (promotion is null)
        {
            return NotFound(new { message = $"Promotion '{promotionCode}' was not found." });
        }

        return Ok(promotion);
    }

    // POST /promotions
    [HttpPost]
    public async Task<ActionResult<PromotionResponse>> Create(
        CreatePromotionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await promotionService.CreateAsync(request, cancellationToken);
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
                $"/promotions/{Uri.EscapeDataString(result.Promotion!.PromotionCode)}",
                result.Promotion);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "A promotion with that code already exists." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new { message = "The promotion references related data that does not exist." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.CheckViolation)
        {
            return BadRequest(new { message = "The promotion data violates a database constraint." });
        }
    }

    // PUT /promotions/{promotionCode}
    [HttpPut("{promotionCode}")]
    public async Task<ActionResult<PromotionResponse>> Update(
        string promotionCode,
        UpdatePromotionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await promotionService.UpdateAsync(promotionCode, request, cancellationToken);
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

            return Ok(result.Promotion);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new { message = "The promotion references related data that does not exist." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.CheckViolation)
        {
            return BadRequest(new { message = "The promotion data violates a database constraint." });
        }
    }

    // DELETE /promotions/{promotionCode}
    [HttpDelete("{promotionCode}")]
    public async Task<IActionResult> Delete(
        string promotionCode,
        CancellationToken cancellationToken)
    {
        var result = await promotionService.DeleteAsync(promotionCode, cancellationToken);
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
