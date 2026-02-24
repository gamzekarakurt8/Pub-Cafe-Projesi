using CafeUygulamasi.Data;
using CafeUygulamasi.Models;
using CafeUygulamasi.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1")]
	public class CategoryController : Controller
	{
		private readonly CafeDbContext _context;

		public CategoryController(CafeDbContext context)
		{
			_context = context;
		}

		// GET: api/v1/categories
		[HttpGet("categories")]
		[AllowAnonymous]
		public async Task<IActionResult> GetAll([FromQuery] string? menuId)
		{
			var query = _context.Categories.AsQueryable();
			if (!string.IsNullOrWhiteSpace(menuId))
				query = query.Where(c => c.MenuId == menuId);

			var categories = await query
				.OrderBy(c => c.Order)
				.ThenBy(c => c.Name)
				.Select(c => new
				{
					id = c.Id,
					menuId = c.MenuId,
					name = c.Name,
					order = c.Order,
					imageUrl = c.ImageUrl,
					menu = c.Menu == null ? null : new
					{
						id = c.Menu.Id,
						title = c.Menu.Title,
						description = c.Menu.Description,
						imageUrl = c.Menu.ImageUrl,
						active = c.Menu.Active
					}
				})
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = categories,
				meta = new { count = categories.Count }
			});
		}

		// GET: api/v1/menus/{menuId}/categories
		[HttpGet("menus/{menuId}/categories")]
		[AllowAnonymous]
		public async Task<IActionResult> GetByMenu(string menuId)
		{
			var categories = await _context.Categories
				.Where(c => c.MenuId == menuId)
				.Select(c => new
				{
					id = c.Id,
					menuId = c.MenuId,
					name = c.Name,
					order = c.Order,
					imageUrl = c.ImageUrl,
					menu = c.Menu == null ? null : new
					{
						id = c.Menu.Id,
						title = c.Menu.Title,
						description = c.Menu.Description,
						imageUrl = c.Menu.ImageUrl,
						active = c.Menu.Active
					},
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
				})
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = categories,
				meta = new { count = categories.Count }
			});
		}

		// GET: api/v1/categories/{id}
		[HttpGet("categories/{id}")]
		[AllowAnonymous]
		public async Task<IActionResult> GetById(string id, [FromQuery] bool? includeProducts)
		{
			var query = _context.Categories.Where(c => c.Id == id);

			if (includeProducts == true)
			{
				var categoryWithProducts = await query
					.Select(c => new
					{
						id = c.Id,
						menuId = c.MenuId,
						name = c.Name,
						order = c.Order,
						imageUrl = c.ImageUrl,
						products = c.Products.Select(p => new
						{
							id = p.Id,
							name = p.Name,
							price = p.Price,
							inStock = p.InStock
						}).ToList()
					})
					.FirstOrDefaultAsync();

				if (categoryWithProducts == null)
					return NotFound(new { success = false, message = "Category not found" });

				return Ok(new { success = true, data = categoryWithProducts });
			}

			var category = await query
				.Select(c => new
				{
					id = c.Id,
					menuId = c.MenuId,
					name = c.Name,
					order = c.Order,
				imageUrl = c.ImageUrl
				})
				.FirstOrDefaultAsync();

			if (category == null)
				return NotFound(new { success = false, message = "Category not found" });

			return Ok(new { success = true, data = category });
		}

		// POST: api/v1/menus/{menuId}/categories
		[HttpPost("menus/{menuId}/categories")]
		[Authorize(Roles = "Admin,admin")]
		public async Task<IActionResult> Create(string menuId, DtoCategoryCreate dto)
		{
			var menuExists = await _context.Menus.AnyAsync(m => m.Id == menuId);
			if (!menuExists)
				return NotFound(new { success = false, message = "Menu not found" });

			var category = new Category
			{
				Name = dto.Name,
				Order = dto.Order,
				ImageUrl = dto.ImageUrl,
				MenuId = menuId
			};

			_context.Categories.Add(category);
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = category });
		}

		// POST: api/v1/categories
		[HttpPost("categories")]
		[Authorize(Roles = "Admin,admin")]
		public async Task<IActionResult> Create(DtoCategoryCreate dto)
		{
			var category = new Category
			{
				Name = dto.Name,
				Order = dto.Order,
				ImageUrl = dto.ImageUrl,
				MenuId = null
			};

			_context.Categories.Add(category);
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = category });
		}

		// POST: api/v1/menus/{menuId}/category-links
		[HttpPost("menus/{menuId}/category-links")]
		public async Task<IActionResult> LinkCategoryToMenu(string menuId, DtoMenuCategoryLinkCreate dto)
		{
			if (string.IsNullOrWhiteSpace(dto.CategoryId))
				return BadRequest(new { success = false, message = "categoryId is required" });

			var menuExists = await _context.Menus.AnyAsync(m => m.Id == menuId);
			if (!menuExists)
				return NotFound(new { success = false, message = "Menu not found" });

			var category = await _context.Categories.FindAsync(dto.CategoryId);
			if (category == null)
				return NotFound(new { success = false, message = "Category not found" });

			category.MenuId = menuId;
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = new { menuId, categoryId = category.Id } });
		}

		// DELETE: api/v1/menus/{menuId}/category-links/{categoryId}
		[HttpDelete("menus/{menuId}/category-links/{categoryId}")]
		public async Task<IActionResult> UnlinkCategoryFromMenu(string menuId, string categoryId)
		{
			var category = await _context.Categories.FindAsync(categoryId);
			if (category == null)
				return NotFound(new { success = false, message = "Category not found" });

			if (!string.Equals(category.MenuId, menuId, StringComparison.Ordinal))
				return NoContent();

			category.MenuId = null;
			await _context.SaveChangesAsync();

			return NoContent();
		}

		// POST: api/v1/categories/{categoryId}/menu-link
		[HttpPost("categories/{categoryId}/menu-link")]
		public async Task<IActionResult> LinkMenuToCategory(string categoryId, DtoCategoryMenuLinkCreate dto)
		{
			if (string.IsNullOrWhiteSpace(dto.MenuId))
				return BadRequest(new { success = false, message = "menuId is required" });

			var category = await _context.Categories.FindAsync(categoryId);
			if (category == null)
				return NotFound(new { success = false, message = "Category not found" });

			var menuExists = await _context.Menus.AnyAsync(m => m.Id == dto.MenuId);
			if (!menuExists)
				return NotFound(new { success = false, message = "Menu not found" });

			category.MenuId = dto.MenuId;
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = new { menuId = dto.MenuId, categoryId } });
		}

		// DELETE: api/v1/categories/{categoryId}/menu-link
		[HttpDelete("categories/{categoryId}/menu-link")]
		public async Task<IActionResult> UnlinkMenuFromCategory(string categoryId)
		{
			var category = await _context.Categories.FindAsync(categoryId);
			if (category == null)
				return NotFound(new { success = false, message = "Category not found" });

			category.MenuId = null;
			await _context.SaveChangesAsync();

			return NoContent();
		}

		// POST: api/v1/categories/{categoryId}/product-links
		[HttpPost("categories/{categoryId}/product-links")]
		public async Task<IActionResult> LinkProductToCategory(string categoryId, DtoCategoryProductLinkCreate dto)
		{
			if (string.IsNullOrWhiteSpace(dto.ProductId))
				return BadRequest(new { success = false, message = "productId is required" });

			var categoryExists = await _context.Categories.AnyAsync(c => c.Id == categoryId);
			if (!categoryExists)
				return NotFound(new { success = false, message = "Category not found" });

			var product = await _context.Products.FindAsync(dto.ProductId);
			if (product == null)
				return NotFound(new { success = false, message = "Product not found" });

			product.CategoryId = categoryId;
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = new { categoryId, productId = product.Id } });
		}

		// DELETE: api/v1/categories/{categoryId}/product-links/{productId}
		[HttpDelete("categories/{categoryId}/product-links/{productId}")]
		public async Task<IActionResult> UnlinkProductFromCategory(string categoryId, string productId)
		{
			var product = await _context.Products.FindAsync(productId);
			if (product == null)
				return NotFound(new { success = false, message = "Product not found" });

			if (!string.Equals(product.CategoryId, categoryId, StringComparison.Ordinal))
				return NoContent();

			product.CategoryId = null;
			await _context.SaveChangesAsync();

			return NoContent();
		}

		// PUT: api/v1/categories/{id}
		[HttpPut("categories/{id}")]
		public async Task<IActionResult> Update(string id, DtoCategoryUpdate dto)
		{
			var category = await _context.Categories.FindAsync(id);

			if (category == null)
				return NotFound(new { success = false, message = "Category not found" });

			category.Name = dto.Name;
			category.Order = dto.Order;
			category.ImageUrl = dto.ImageUrl;

			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = category });
		}

		// DELETE: api/v1/categories/{id}
		[HttpDelete("categories/{id}")]
		public async Task<IActionResult> Delete(string id)
		{
			var category = await _context.Categories.FindAsync(id);

			if (category == null)
				return NotFound(new { success = false, message = "Category not found" });

			_context.Categories.Remove(category);
			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new { deleted = true, id }
			});
		}

	}
}
