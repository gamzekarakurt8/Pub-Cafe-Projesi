using CafeUygulamasi.Data;
using CafeUygulamasi.Models;
using CafeUygulamasi.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1/contact")]
	public class ContactController : Controller
	{
		private readonly CafeDbContext _context;

		public ContactController(CafeDbContext context)
		{
			_context = context;
		}

		// GET: api/v1/contact/info
		[HttpGet("info")]
		[AllowAnonymous]
		public async Task<IActionResult> GetInfo()
		{
			var info = await _context.ContactInfos.FirstOrDefaultAsync();

			return Ok(new { success = true, data = info });
		}

		// PUT: api/v1/contact/info
		[HttpPut("info")]
		public async Task<IActionResult> UpsertInfo(DtoContactInfoUpdate dto)
		{
			var info = await _context.ContactInfos.FirstOrDefaultAsync();

			if (info == null)
			{
				info = new ContactInfo
				{
					Phone = dto.Phone,
					Email = dto.Email,
					Social = dto.Social,
					OrderLinks = dto.OrderLinks
				};
				_context.ContactInfos.Add(info);
			}
			else
			{
				info.Phone = dto.Phone;
				info.Email = dto.Email;
				info.Social = dto.Social;
				info.OrderLinks = dto.OrderLinks;
			}

			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = info });
		}

		// POST: api/v1/contact/info (upsert)
		[HttpPost("info")]
		public async Task<IActionResult> UpsertInfoPost(DtoContactInfoUpdate dto)
		{
			return await UpsertInfo(dto);
		}

		// POST: api/v1/contact/requests
		[HttpPost("requests")]
		[AllowAnonymous]
		public async Task<IActionResult> CreateRequest(DtoContactRequestCreate dto)
		{
			if (string.IsNullOrWhiteSpace(dto.PhoneOrEmail))
			{
				return BadRequest(new
				{
					success = false,
					error = new
					{
						code = "VALIDATION_ERROR",
						message = "phoneOrEmail is required",
						details = new[] { new { field = "phoneOrEmail", issue = "REQUIRED" } }
					}
				});
			}

			var request = new ContactRequest
			{
				FullName = dto.FullName,
				PhoneOrEmail = dto.PhoneOrEmail,
				Type = dto.Type,
				Message = dto.Message,
				CreatedAt = DateTime.UtcNow
			};

			_context.ContactRequests.Add(request);
			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new
				{
					requestId = request.Id,
					createdAt = request.CreatedAt,
					status = "RECEIVED"
				}
			});
		}

		// GET: api/v1/contact/requests
		[HttpGet("requests")]
		public async Task<IActionResult> GetRequests()
		{
			var requests = await _context.ContactRequests
				.OrderByDescending(r => r.CreatedAt)
				.Select(r => new
				{
					id = r.Id,
					fullName = r.FullName,
					phoneOrEmail = r.PhoneOrEmail,
					type = r.Type,
					message = r.Message,
					createdAt = r.CreatedAt
				})
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = requests,
				meta = new { count = requests.Count }
			});
		}
	}
}
