using Npgsql;
using TECAir.Application.DTOs.Auth;
using TECAir.Application.DTOs.Users;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Este repositorio es la capa que habla con PostgreSQL usando Npgsql.
// No usa Entity Framework: aqui escribimos SQL manual, parametros y transacciones.
public sealed class PostgresUserRepository(NpgsqlDataSource dataSource) : IUserRepository
{
    // Consulta un usuario por email.
    // LEFT JOIN permite traer datos de student si existen, sin excluir usuarios normales.
    public async Task<UserResponse?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                u.email,
                CONCAT_WS(' ', u.name, u.last_name) AS full_name,
                u.phone_number,
                u.role,
                s.user_email IS NOT NULL AS is_student,
                s.college_name,
                s.user_carnet,
                s.miles
            FROM app_user u
            LEFT JOIN student s
                ON s.user_email = u.email
            WHERE LOWER(u.email) = LOWER(@email);
            """;

        // CreateCommand crea el comando SQL que se enviara a PostgreSQL.
        await using var command = dataSource.CreateCommand(sql);

        // Los parametros evitan concatenar strings y protegen contra SQL injection.
        command.Parameters.AddWithValue("email", email);

        // ExecuteReaderAsync se usa porque el SELECT puede devolver filas.
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapUserResponse(reader);
    }

    // Consulta datos privados para login. El password_hash se lee solo para que
    // AuthService pueda verificar la contrasena y nunca se expone como respuesta HTTP.
    public async Task<AuthenticatedUserData?> GetForLoginAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                u.email,
                u.password_hash,
                CONCAT_WS(' ', u.name, u.last_name) AS full_name,
                u.role,
                s.user_email IS NOT NULL AS is_student,
                s.college_name,
                s.user_carnet,
                s.miles
            FROM tecair.app_user u
            LEFT JOIN tecair.student s
                ON s.user_email = u.email
            WHERE LOWER(u.email) = LOWER(@email);
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("email", email);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapAuthenticatedUserData(reader);
    }

    // Crea un usuario nuevo.
    // Como puede insertar en app_user y tambien en student, usamos una transaccion
    // para que ambas operaciones se guarden juntas o ninguna se guarde.
    public async Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        const string insertUserSql = """
            INSERT INTO app_user (
                email,
                password_hash,
                name,
                last_name,
                phone_number,
                role
            )
            VALUES (
                @email,
                @password_hash,
                @name,
                @last_name,
                @phone_number,
                @role
            );
            """;

        // Primer INSERT: datos comunes de cualquier usuario.
        await using (var command = new NpgsqlCommand(insertUserSql, connection, transaction))
        {
            command.Parameters.AddWithValue("email", request.Email.Trim());
            command.Parameters.AddWithValue("password_hash", request.Password);
            command.Parameters.AddWithValue("name", request.Name.Trim());
            command.Parameters.AddWithValue("last_name", request.Lname.Trim());
            command.Parameters.AddWithValue("phone_number", request.PhoneNum.Trim());
            command.Parameters.AddWithValue("role", request.Role.Trim().ToUpperInvariant());

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        // Segundo INSERT opcional: solo se ejecuta cuando el usuario tambien es estudiante.
        if (request.IsStudent)
        {
            const string insertStudentSql = """
                INSERT INTO student (
                    user_email,
                    user_carnet,
                    college_name
                )
                VALUES (
                    @user_email,
                    @user_carnet,
                    @college_name
                );
                """;

            await using var command = new NpgsqlCommand(insertStudentSql, connection, transaction);
            command.Parameters.AddWithValue("user_email", request.Email.Trim());
            command.Parameters.AddWithValue("user_carnet", request.UserCarnet!.Trim());
            command.Parameters.AddWithValue("college_name", request.CollegeName!.Trim());

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        // Commit confirma la transaccion. Si algo falla antes, no se confirma nada.
        await transaction.CommitAsync(cancellationToken);

        // Despues de insertar, se reutiliza el GET para devolver la respuesta completa
        // con el mismo formato que consume la API.
        var createdUser = await GetByEmailAsync(request.Email, cancellationToken);
        return createdUser ?? throw new Exception("Failed to retrieve the created user.");
    }

    // Verifica existencia usando el email normalizado por el servicio.
    public async Task<bool> UserExistsAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.app_user
                WHERE LOWER(email) = LOWER(@email)
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("email", email);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Busca si el carnet ya pertenece a otro usuario estudiante.
    public async Task<bool> UserCarnetBelongsToAnotherStudentAsync(
        string email,
        string userCarnet,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.student
                WHERE
                    user_carnet = @user_carnet
                    AND LOWER(user_email) <> LOWER(@user_email)
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("user_email", email);
        command.Parameters.AddWithValue("user_carnet", userCarnet);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Las reservaciones referencian usuarios con ON DELETE RESTRICT.
    // Revisarlo antes del DELETE permite devolver un 409 claro desde el servicio.
    public async Task<bool> UserHasReservationsAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.reservation
                WHERE LOWER(user_email) = LOWER(@user_email)
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("user_email", email);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Actualiza datos del usuario y sincroniza la tabla student en una transaccion.
    // El email no se actualiza porque es la llave primaria y viene de la ruta.
    public async Task<UserResponse> UpdateAsync(
        string email,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        const string updateUserSql = """
            UPDATE tecair.app_user
            SET
                password_hash = CASE
                    WHEN NULLIF(@password_hash, '') IS NULL THEN password_hash
                    ELSE @password_hash
                END,
                name = @name,
                last_name = @last_name,
                phone_number = @phone_number,
                role = @role
            WHERE LOWER(email) = LOWER(@email);
            """;

        await using (var command = new NpgsqlCommand(updateUserSql, connection, transaction))
        {
            command.Parameters.AddWithValue("email", email);
            command.Parameters.AddWithValue("password_hash", request.Password);
            command.Parameters.AddWithValue("name", request.Name);
            command.Parameters.AddWithValue("last_name", request.Lname);
            command.Parameters.AddWithValue("phone_number", request.PhoneNum);
            command.Parameters.AddWithValue("role", request.Role);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        if (request.IsStudent)
        {
            const string upsertStudentSql = """
                INSERT INTO tecair.student (
                    user_email,
                    user_carnet,
                    college_name
                )
                VALUES (
                    @user_email,
                    @user_carnet,
                    @college_name
                )
                ON CONFLICT (user_email)
                DO UPDATE SET
                    user_carnet = EXCLUDED.user_carnet,
                    college_name = EXCLUDED.college_name;
                """;

            await using var command = new NpgsqlCommand(upsertStudentSql, connection, transaction);
            command.Parameters.AddWithValue("user_email", email);
            command.Parameters.AddWithValue("user_carnet", request.UserCarnet!);
            command.Parameters.AddWithValue("college_name", request.CollegeName!);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        else
        {
            const string deleteStudentSql = """
                DELETE FROM tecair.student
                WHERE LOWER(user_email) = LOWER(@user_email);
                """;

            await using var command = new NpgsqlCommand(deleteStudentSql, connection, transaction);
            command.Parameters.AddWithValue("user_email", email);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        // El request conserva Minit por contrato, pero el esquema actual de app_user no tiene esa columna.
        await transaction.CommitAsync(cancellationToken);

        var updatedUser = await GetByEmailAsync(email, cancellationToken);
        return updatedUser ?? throw new InvalidOperationException("Failed to retrieve the updated user.");
    }

    public async Task DeleteAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM tecair.app_user
            WHERE LOWER(email) = LOWER(@email);
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("email", email);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    // Convierte la fila leida por NpgsqlDataReader a nuestro DTO de respuesta.
    // Los indices corresponden al orden de columnas definido en el SELECT.
    private static UserResponse MapUserResponse(NpgsqlDataReader reader)
    {
        return new UserResponse
        {
            Email = reader.GetString(0),
            FullName = reader.GetString(1),
            PhoneNum = reader.GetString(2),
            Role = reader.GetString(3),
            IsStudent = reader.GetBoolean(4),
            CollegeName = reader.IsDBNull(5) ? null : reader.GetString(5),
            UserCarnet = reader.IsDBNull(6) ? null : reader.GetString(6),
            Miles = reader.IsDBNull(7) ? null : reader.GetInt32(7)
        };
    }

    // Mapea la fila usada internamente por autenticacion. Se mantiene separada
    // del DTO publico para evitar filtrar el password_hash por accidente.
    private static AuthenticatedUserData MapAuthenticatedUserData(NpgsqlDataReader reader)
    {
        return new AuthenticatedUserData
        {
            Email = reader.GetString(0),
            PasswordHash = reader.GetString(1),
            FullName = reader.GetString(2),
            Role = reader.GetString(3),
            IsStudent = reader.GetBoolean(4),
            CollegeName = reader.IsDBNull(5) ? null : reader.GetString(5),
            UserCarnet = reader.IsDBNull(6) ? null : reader.GetString(6),
            Miles = reader.IsDBNull(7) ? null : reader.GetInt32(7)
        };
    }
}
