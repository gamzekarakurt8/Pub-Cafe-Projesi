using CafeUygulamasi.Data;
using CafeUygulamasi.Models;
using CafeUygulamasi.Models.Dto;
using CafeUygulamasi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1")]
	public class UserAuthController : Controller
	{
		private readonly CafeDbContext _context;
		private readonly IConfiguration _configuration;

		public UserAuthController(CafeDbContext context, IConfiguration configuration)
		{
			_context = context;
			_configuration = configuration;
		}

		// POST: api/v1/auth/login
		[HttpPost("auth/login")]
		[AllowAnonymous]
		public async Task<IActionResult> Login(DtoUserLogin dto)
		{
			var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
			if (user == null || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
			{
				return Unauthorized(new
				{
					success = false,
					error = new { code = "UNAUTHORIZED", message = "Invalid credentials." }
				});
			}

			return Ok(new { success = true, data = CreateToken(user) });
		}

		// POST: api/v1/users
		[HttpPost("users")]
		[AllowAnonymous]
		public async Task<IActionResult> Register(DtoUserRegister dto)
		{
			if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
			{
				return BadRequest(new
				{
					success = false,
					error = new { code = "VALIDATION_ERROR", message = "username and password are required" }
				});
			}

			var exists = await _context.Users.AnyAsync(u => u.Username == dto.Username);
			if (exists)
			{
				return BadRequest(new
				{
					success = false,
					error = new { code = "USERNAME_TAKEN", message = "Username is already taken." }
				});
			}

			var role = string.IsNullOrWhiteSpace(dto.Role) ? "User" : dto.Role;

			var user = new AppUser
			{
				Username = dto.Username,
				PasswordHash = PasswordHasher.Hash(dto.Password),
				Role = role,
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			};

			_context.Users.Add(user);
			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new
				{
					id = user.Id,
					username = user.Username,
					role = user.Role,
					createdAt = user.CreatedAt
				}
			});
		}

		// GET: api/v1/users
		[HttpGet("users")]
		[Authorize(Roles = "Admin,admin")]
		public async Task<IActionResult> GetUsers()
		{
			var users = await _context.Users
				.AsNoTracking()
				.OrderBy(u => u.Username)
				.Select(u => new
				{
					id = u.Id,
					username = u.Username,
					role = u.Role,
					createdAt = u.CreatedAt,
					updatedAt = u.UpdatedAt
				})
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = users
			});
		}

		// PUT: api/v1/users/{id}
		[HttpPut("users/{id}")]
		public async Task<IActionResult> Update(string id, DtoUserUpdate dto)
		{
			var user = await _context.Users.FindAsync(id);
			if (user == null)
				return NotFound(new { success = false, message = "User not found" });

			var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			var isAdmin = IsAdmin();

			if (!isAdmin && !string.Equals(currentUserId, user.Id, StringComparison.Ordinal))
			{
				return Forbid();
			}

			if (!string.IsNullOrWhiteSpace(dto.Username))
			{
				var usernameTaken = await _context.Users
					.AnyAsync(u => u.Id != user.Id && u.Username == dto.Username);
				if (usernameTaken)
				{
					return BadRequest(new
					{
						success = false,
						error = new { code = "USERNAME_TAKEN", message = "Username is already taken." }
					});
				}
			}

			if (!string.IsNullOrWhiteSpace(dto.Username))
				user.Username = dto.Username;

			if (!string.IsNullOrWhiteSpace(dto.Password))
				user.PasswordHash = PasswordHasher.Hash(dto.Password);

			if (isAdmin && !string.IsNullOrWhiteSpace(dto.Role))
				user.Role = dto.Role;

			user.UpdatedAt = DateTime.UtcNow;

			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new { id = user.Id, username = user.Username, role = user.Role, updatedAt = user.UpdatedAt }
			});
		}

		// DELETE: api/v1/users/{id}
		[HttpDelete("users/{id}")]
		public async Task<IActionResult> Delete(string id)
		{
			var user = await _context.Users.FindAsync(id);
			if (user == null)
				return NotFound(new { success = false, message = "User not found" });

			var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
			var isAdmin = IsAdmin();

			if (!isAdmin && !string.Equals(currentUserId, user.Id, StringComparison.Ordinal))
			{
				return Forbid();
			}

			_context.Users.Remove(user);
			await _context.SaveChangesAsync();

			return NoContent();
		}

		private object CreateToken(AppUser user)
		{
			var jwtKey = _configuration["Jwt:Key"];
			var jwtIssuer = _configuration["Jwt:Issuer"];
			var jwtAudience = _configuration["Jwt:Audience"];
			var expiresMinutes = int.TryParse(_configuration["Jwt:ExpireMinutes"], out var mins) ? mins : 60;

			if (string.IsNullOrWhiteSpace(jwtKey) || string.IsNullOrWhiteSpace(jwtIssuer) || string.IsNullOrWhiteSpace(jwtAudience))
				throw new InvalidOperationException("JWT settings are not configured.");

			var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
			var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
			var expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);

			var claims = new[]
			{
				new Claim(ClaimTypes.NameIdentifier, user.Id),
				new Claim(ClaimTypes.Name, user.Username),
				new Claim(ClaimTypes.Role, user.Role)
			};

			var token = new JwtSecurityToken(
				issuer: jwtIssuer,
				audience: jwtAudience,
				claims: claims,
				expires: expiresAt,
				signingCredentials: creds
			);

			var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

			return new
			{
				token = tokenString,
				tokenType = "Bearer",
				expiresAt
			};
		}

		private bool IsAdmin()
		{
			return User.Claims.Any(c =>
				c.Type == ClaimTypes.Role &&
				string.Equals(c.Value, "admin", StringComparison.OrdinalIgnoreCase));
		}
	}
}
