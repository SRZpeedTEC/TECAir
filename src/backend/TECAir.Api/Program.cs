using Npgsql;
using TECAir.Application.Interfaces;
using TECAir.Application.Services;
using TECAir.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var connectionString = builder.Configuration.GetConnectionString("TECAirDatabase")
    ?? throw new InvalidOperationException("Connection string 'TECAirDatabase' was not found.");

builder.Services.AddSingleton(_ => new NpgsqlDataSourceBuilder(connectionString).Build());
builder.Services.AddScoped<IAirportRepository, PostgresAirportRepository>();
builder.Services.AddScoped<IAirportService, AirportService>();
builder.Services.AddScoped<IItineraryRepository, PostgresItineraryRepository>();
builder.Services.AddScoped<IItineraryService, ItineraryService>();
builder.Services.AddScoped<IUserRepository, PostgresUserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "TECAir.Api" }));
app.MapControllers();

app.Run();
