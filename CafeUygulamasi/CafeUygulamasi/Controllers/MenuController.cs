using CafeUygulamasi.Data;
using CafeUygulamasi.Models;
using CafeUygulamasi.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1/menus")]
	public class MenuController : Controller
	{
		private readonly CafeDbContext _context;

		public MenuController(CafeDbContext context)
		{
			_context = context;
		}

		// GET: api/v1/menus
		[HttpGet]
		[AllowAnonymous]
		public async Task<IActionResult> GetAll([FromQuery] bool? active)
		{
			var query = _context.Menus.AsQueryable();
			if (active.HasValue)
				query = query.Where(m => m.Active == active.Value);

			var menus = await query
				.Select(m => new
				{
					id = m.Id,
					title = m.Title,
					description = m.Description,
					imageUrl = m.ImageUrl,
					active = m.Active,
					categories = m.Categories
						.OrderBy(c => c.Order)
						.Select(c => new
						{
							id = c.Id,
							name = c.Name,
							order = c.Order,
							imageUrl = c.ImageUrl
						}).ToList()
				})
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = menus,
				meta = new { count = menus.Count }
			});
		}

		// GET: api/v1/menus/{id}
		[HttpGet("{id}")]
		[AllowAnonymous]
		public async Task<IActionResult> GetById(string id)
		{
			var menu = await _context.Menus
				.Where(m => m.Id == id)
				.Select(m => new
				{
					id = m.Id,
					title = m.Title,
					description = m.Description,
					imageUrl = m.ImageUrl,
					active = m.Active,
					categories = m.Categories
						.OrderBy(c => c.Order)
						.Select(c => new
						{
							id = c.Id,
							name = c.Name,
							order = c.Order,
							imageUrl = c.ImageUrl,
							products = c.Products.Select(p => new
							{
								id = p.Id,
								name = p.Name,
								description = p.Description,
								price = p.Price,
								discountedPrice = p.DiscountedPrice,
								inStock = p.InStock,
								imageUrl = p.ImageUrl
							}).ToList()
						}).ToList()
				})
				.FirstOrDefaultAsync();

			if (menu == null)
				return NotFound(new { success = false, message = "Menu not found" });

			return Ok(new { success = true, data = menu });
		}

		// POST: api/v1/menus
		[HttpPost]
		public async Task<IActionResult> Create(DtoMenuCreate dto)
		{
			var menu = new Menu
			{
				Title = dto.Title,
				Description = dto.Description,
				ImageUrl = dto.ImageUrl,
				Active = dto.Active
			};

			_context.Menus.Add(menu);
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = menu });
		}

		[HttpPut("{id}")]
		public async Task<IActionResult> Update(string id, DtoMenuUpdate dto)
		{
			var menu = await _context.Menus.FindAsync(id);

			if (menu == null)
				return NotFound(new { success = false, message = "Menu not found" });

			menu.Title = dto.Title;
			menu.Description = dto.Description;
			menu.ImageUrl = dto.ImageUrl;
			menu.Active = dto.Active;

			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = menu });
		}
		// DELETE: api/v1/menus/{id}
		[HttpDelete("{id}")]
		public async Task<IActionResult> Delete(string id)
		{
			var menu = await _context.Menus.FindAsync(id);

			if (menu == null)
				return NotFound(new { success = false, message = "Menu not found" });

			_context.Menus.Remove(menu);
			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new { deleted = true, id }
			});
		}
	}
}
