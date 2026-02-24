using CafeUygulamasi.Data;
using CafeUygulamasi.Models;
using CafeUygulamasi.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1/page-sections")]
	public class PageSectionController : Controller
	{
		private readonly CafeDbContext _context;

		public PageSectionController(CafeDbContext context)
		{
			_context = context;
		}

		[HttpGet("landing-page")]
		[AllowAnonymous]
		public Task<IActionResult> GetLandingPage() => GetByPageKey(PageSectionKeys.LandingPage);

		[HttpPut("landing-page")]
		public Task<IActionResult> UpsertLandingPage(DtoPageSectionUpsert dto) => UpsertByPageKey(PageSectionKeys.LandingPage, dto);

		[HttpGet("menu")]
		[AllowAnonymous]
		public Task<IActionResult> GetMenu() => GetByPageKey(PageSectionKeys.Menu);

		[HttpPut("menu")]
		public Task<IActionResult> UpsertMenu(DtoPageSectionUpsert dto) => UpsertByPageKey(PageSectionKeys.Menu, dto);

		[HttpGet("branches")]
		[AllowAnonymous]
		public Task<IActionResult> GetBranches() => GetByPageKey(PageSectionKeys.Branches);

		[HttpPut("branches")]
		public Task<IActionResult> UpsertBranches(DtoPageSectionUpsert dto) => UpsertByPageKey(PageSectionKeys.Branches, dto);

		[HttpGet("contact")]
		[AllowAnonymous]
		public Task<IActionResult> GetContact() => GetByPageKey(PageSectionKeys.Contact);

		[HttpPut("contact")]
		public Task<IActionResult> UpsertContact(DtoPageSectionUpsert dto) => UpsertByPageKey(PageSectionKeys.Contact, dto);

		private async Task<IActionResult> GetByPageKey(string pageKey)
		{
			var content = await _context.PageSectionContents
				.AsNoTracking()
				.FirstOrDefaultAsync(x => x.PageKey == pageKey);

			if (content == null)
			{
				return Ok(new
				{
					success = true,
					data = new
					{
						pageKey,
						title = string.Empty,
						description = string.Empty,
						imageUrl = string.Empty,
						tags = Array.Empty<string>()
					}
				});
			}

			return Ok(new
			{
				success = true,
				data = new
				{
					pageKey = content.PageKey,
					title = content.Title,
					description = content.Description,
					imageUrl = content.ImageUrl,
					tags = content.Tags
				}
			});
		}

		private async Task<IActionResult> UpsertByPageKey(string pageKey, DtoPageSectionUpsert dto)
		{
			var content = await _context.PageSectionContents
				.FirstOrDefaultAsync(x => x.PageKey == pageKey);

			var normalizedTags = NormalizeTags(dto.Tags);
			if (content == null)
			{
				content = new PageSectionContent
				{
					PageKey = pageKey,
					Title = dto.Title,
					Description = dto.Description,
					ImageUrl = dto.ImageUrl,
					Tags = normalizedTags
				};
				_context.PageSectionContents.Add(content);
			}
			else
			{
				content.Title = dto.Title;
				content.Description = dto.Description;
				content.ImageUrl = dto.ImageUrl;
				content.Tags = normalizedTags;
			}

			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new
				{
					pageKey = content.PageKey,
					title = content.Title,
					description = content.Description,
					imageUrl = content.ImageUrl,
					tags = content.Tags
				}
			});
		}

		private static List<string> NormalizeTags(List<string>? tags)
		{
			if (tags == null || tags.Count == 0)
				return [];

			return tags
				.Where(tag => !string.IsNullOrWhiteSpace(tag))
				.Select(tag => tag.Trim())
				.Distinct(StringComparer.OrdinalIgnoreCase)
				.ToList();
		}
	}
}
