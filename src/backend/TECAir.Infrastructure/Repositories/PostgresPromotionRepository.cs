using Npgsql;
using NpgsqlTypes;
using TECAir.Application.DTOs.Promotions;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio de promociones usando SQL manual con Npgsql.
public sealed class PostgresPromotionRepository(NpgsqlDataSource dataSource) : IPromotionRepository
{
    public async Task<IReadOnlyList<PromotionResponse>> SearchAsync(
        PromotionSearchFilters filters,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                promotion_code,
                itinerary_id,
                image_url,
                start_date,
                end_date,
                discount_percent,
                promo_price
            FROM tecair.promotion
            WHERE
                (@promotion_code IS NULL OR UPPER(promotion_code) = @promotion_code)
                AND (@itinerary_id IS NULL OR itinerary_id = @itinerary_id)
                AND (@start_date IS NULL OR start_date = @start_date)
                AND (@end_date IS NULL OR end_date = @end_date)
                AND (
                    @active_only = FALSE
                    OR (start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)
                )
                AND (
                    @expired_only = FALSE
                    OR end_date < CURRENT_DATE
                )
                AND (
                    @upcoming_only = FALSE
                    OR start_date > CURRENT_DATE
                )
            ORDER BY start_date DESC, promotion_code ASC;
            """;

        var promotions = new List<PromotionResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.Add("promotion_code", NpgsqlDbType.Varchar).Value =
            (object?)filters.PromotionCode ?? DBNull.Value;
        command.Parameters.Add("itinerary_id", NpgsqlDbType.Integer).Value =
            (object?)filters.ItineraryId ?? DBNull.Value;
        command.Parameters.Add("start_date", NpgsqlDbType.Date).Value =
            (object?)filters.StartDate ?? DBNull.Value;
        command.Parameters.Add("end_date", NpgsqlDbType.Date).Value =
            (object?)filters.EndDate ?? DBNull.Value;
        command.Parameters.AddWithValue("active_only", filters.ActiveOnly == true);
        command.Parameters.AddWithValue("expired_only", filters.ExpiredOnly == true);
        command.Parameters.AddWithValue("upcoming_only", filters.UpcomingOnly == true);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            promotions.Add(MapPromotionResponse(reader));
        }

        return promotions;
    }

    public Task<IReadOnlyList<PromotionResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return SearchAsync(new PromotionSearchFilters(), cancellationToken);
    }

    public async Task<PromotionResponse?> GetByCodeAsync(
        string promotionCode,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                promotion_code,
                itinerary_id,
                image_url,
                start_date,
                end_date,
                discount_percent,
                promo_price
            FROM tecair.promotion
            WHERE promotion_code = @promotion_code;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("promotion_code", promotionCode);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapPromotionResponse(reader);
    }

    public async Task<PromotionResponse> CreateAsync(
        CreatePromotionRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO tecair.promotion (
                promotion_code,
                itinerary_id,
                image_url,
                start_date,
                end_date,
                discount_percent,
                promo_price
            )
            VALUES (
                @promotion_code,
                @itinerary_id,
                @image_url,
                @start_date,
                @end_date,
                @discount_percent,
                @promo_price
            )
            RETURNING
                promotion_code,
                itinerary_id,
                image_url,
                start_date,
                end_date,
                discount_percent,
                promo_price;
            """;

        await using var command = dataSource.CreateCommand(sql);
        AddCreateParameters(command, request);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to create the promotion.");
        }

        return MapPromotionResponse(reader);
    }

    public async Task<PromotionResponse> UpdateAsync(
        string promotionCode,
        UpdatePromotionRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.promotion
            SET
                itinerary_id = @itinerary_id,
                image_url = @image_url,
                start_date = @start_date,
                end_date = @end_date,
                discount_percent = @discount_percent,
                promo_price = @promo_price
            WHERE promotion_code = @promotion_code
            RETURNING
                promotion_code,
                itinerary_id,
                image_url,
                start_date,
                end_date,
                discount_percent,
                promo_price;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("promotion_code", promotionCode);
        AddUpdateParameters(command, request);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to update the promotion.");
        }

        return MapPromotionResponse(reader);
    }

    public async Task DeleteAsync(string promotionCode, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM tecair.promotion
            WHERE promotion_code = @promotion_code;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("promotion_code", promotionCode);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> PromotionExistsAsync(
        string promotionCode,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.promotion
                WHERE promotion_code = @promotion_code
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("promotion_code", promotionCode);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> ItineraryExistsAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.itinerary
                WHERE itinerary_id = @itinerary_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> ItineraryAlreadyHasPromotionAsync(
        int itineraryId,
        string? excludingPromotionCode = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.promotion
                WHERE
                    itinerary_id = @itinerary_id
                    AND (
                        @excluding_promotion_code IS NULL
                        OR promotion_code <> @excluding_promotion_code
                    )
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);
        command.Parameters.Add("excluding_promotion_code", NpgsqlDbType.Varchar).Value =
            (object?)excludingPromotionCode ?? DBNull.Value;

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    private static void AddCreateParameters(NpgsqlCommand command, CreatePromotionRequest request)
    {
        command.Parameters.AddWithValue("promotion_code", request.PromotionCode);
        command.Parameters.AddWithValue("itinerary_id", request.ItineraryId);
        command.Parameters.Add("image_url", NpgsqlDbType.Varchar).Value =
            (object?)request.ImageUrl ?? DBNull.Value;
        command.Parameters.AddWithValue("start_date", request.StartDate);
        command.Parameters.AddWithValue("end_date", request.EndDate);
        command.Parameters.AddWithValue("discount_percent", request.DiscountPercent);
        command.Parameters.AddWithValue("promo_price", request.PromoPrice);
    }

    private static void AddUpdateParameters(NpgsqlCommand command, UpdatePromotionRequest request)
    {
        command.Parameters.AddWithValue("itinerary_id", request.ItineraryId);
        command.Parameters.Add("image_url", NpgsqlDbType.Varchar).Value =
            (object?)request.ImageUrl ?? DBNull.Value;
        command.Parameters.AddWithValue("start_date", request.StartDate);
        command.Parameters.AddWithValue("end_date", request.EndDate);
        command.Parameters.AddWithValue("discount_percent", request.DiscountPercent);
        command.Parameters.AddWithValue("promo_price", request.PromoPrice);
    }

    private static PromotionResponse MapPromotionResponse(NpgsqlDataReader reader)
    {
        return new PromotionResponse
        {
            PromotionCode = reader.GetString(0),
            ItineraryId = reader.GetInt32(1),
            ImageUrl = reader.IsDBNull(2) ? null : reader.GetString(2),
            StartDate = reader.GetFieldValue<DateOnly>(3),
            EndDate = reader.GetFieldValue<DateOnly>(4),
            DiscountPercent = reader.GetDecimal(5),
            PromoPrice = reader.GetInt32(6)
        };
    }
}
